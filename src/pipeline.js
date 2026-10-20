import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { config, loadGlossary, loadPlayers, readJson, speakerLabel } from './config.js';

const LINE_RE = /^\[\d{2}:\d{2}:\d{2}\]/;

/** Chạy faster-whisper. onProgress(done, total) được gọi theo từng đoạn audio. */
export function runStt(sessionDir, { onProgress = () => {}, log = console } = {}) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(config.pythonBin)) {
      reject(new Error(`Không thấy Python của STT ở ${config.pythonBin}. Chạy setup.ps1 trước.`));
      return;
    }
    const child = spawn(config.pythonBin, ['-X', 'utf8', config.sttScript, sessionDir], {
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });
    let tail = '';
    const onData = (buf) => {
      const text = buf.toString('utf8');
      tail = (tail + text).slice(-4000);
      for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^PROGRESS (\d+)\/(\d+)/);
        if (m) onProgress(Number(m[1]), Number(m[2]));
        else if (line.trim()) log.info(`[stt] ${line.trim()}`);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', reject);
    child.on('close', (code) => {
      const out = path.join(sessionDir, 'transcript_raw.md');
      if (code === 0 && fs.existsSync(out)) resolve(out);
      else reject(new Error(`STT thoát với mã ${code}:\n${tail.slice(-1500)}`));
    });
  });
}

function fill(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? '');
}

function stripFences(text) {
  return text.replace(/^```[a-z]*\s*\n/i, '').replace(/\n```\s*$/, '').trim();
}

/**
 * Env cho tiến trình claude con. Bỏ API key và biến của phiên Claude Code cha (nếu bot được chạy
 * từ trong Claude Code) để `claude -p` dùng tài khoản gói Pro đã đăng nhập, không tính tiền API.
 * Muốn dùng API key thật thì đặt CLAUDE_USE_API_KEY=1.
 */
function claudeEnv() {
  const env = { ...process.env };
  if (process.env.CLAUDE_USE_API_KEY === '1') return env;
  for (const key of Object.keys(env)) {
    if (/^(ANTHROPIC_|CLAUDE_CODE_|CLAUDECODE$|CLAUDE_AGENT_SDK)/.test(key)) delete env[key];
  }
  // Token dài hạn của gói Pro tạo bằng `claude setup-token`
  if (process.env.CLAUDE_OAUTH_TOKEN) env.CLAUDE_CODE_OAUTH_TOKEN = process.env.CLAUDE_OAUTH_TOKEN;
  return env;
}

function spawnLlm(prompt) {
  const provider = config.llmProvider;
  let cmd;
  let args;
  let shell = false;
  let env = process.env;
  if (provider === 'claude') {
    env = claudeEnv();
    cmd = process.env.CLAUDE_BIN || 'claude';
    args = [
      '-p',
      '--output-format', 'text',
      '--tools', '', // không cần tool nào, chỉ đọc và viết
      '--no-session-persistence',
      '--disable-slash-commands',
      '--system-prompt',
      'Bạn là biên tập viên cho các buổi chơi D&D bằng tiếng Việt. Làm đúng yêu cầu trong tin nhắn và chỉ trả về kết quả, không giải thích thêm.',
    ];
    if (config.llmModel) args.push('--model', config.llmModel);
  } else if (provider === 'gemini') {
    cmd = process.env.GEMINI_BIN || 'gemini';
    args = ['-p', '"Thực hiện đúng yêu cầu trong nội dung được cung cấp. Chỉ trả về kết quả."'];
    if (config.llmModel) args.push('-m', config.llmModel);
    shell = true; // gemini cài qua npm là file .cmd trên Windows
  } else {
    throw new Error(`LLM_PROVIDER không hợp lệ: ${provider}`);
  }

  return new Promise((resolve, reject) => {
    // Chạy trong thư mục tạm để Claude Code không đọc CLAUDE.md của project này
    const child = spawn(cmd, args, { cwd: os.tmpdir(), windowsHide: true, shell, env });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`LLM quá ${config.llmTimeoutSec} giây không trả lời`));
    }, config.llmTimeoutSec * 1000);
    child.stdout.on('data', (b) => (stdout += b.toString('utf8')));
    child.stderr.on('data', (b) => (stderr += b.toString('utf8')));
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const text = stripFences(stdout);
      if (code === 0 && text) resolve(text);
      else reject(new Error(`${provider} thoát với mã ${code}: ${(stderr || stdout).slice(-800)}`));
    });
    child.stdin.end(prompt, 'utf8');
  });
}

export async function callLlm(prompt, { log = console, retries = 1 } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await spawnLlm(prompt);
    } catch (err) {
      if (/401|authenticat|API key|not logged in|login/i.test(err.message)) {
        throw new Error(
          `${config.llmProvider} chưa đăng nhập được (${err.message.trim().slice(0, 200)}). ` +
            'Chạy "claude auth login" trong terminal, hoặc tạo token bằng "claude setup-token" rồi điền CLAUDE_OAUTH_TOKEN trong .env.',
        );
      }
      if (attempt >= retries) throw err;
      log.warn(`[llm] lỗi, thử lại sau 20 giây: ${err.message}`);
      await new Promise((r) => setTimeout(r, 20_000));
    }
  }
}

function chunkLines(lines, maxChars) {
  const chunks = [];
  let current = [];
  let size = 0;
  for (const line of lines) {
    if (size + line.length > maxChars && current.length) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(line);
    size += line.length + 1;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

function describePlayers(sessionDir) {
  const players = loadPlayers();
  const speakers = readJson(path.join(sessionDir, 'session.json'), {}).speakers ?? {};
  // Chỉ những người có mặt trong buổi, để LLM không kể về nhân vật vắng mặt
  const ids = new Set(Object.keys(speakers).length ? Object.keys(speakers) : Object.keys(players));
  const rows = [...ids].map((id) => {
    const p = players[id];
    const label = speakerLabel(id, players, speakers[id]?.displayName);
    if (!p) return `- ${label}: chưa khai báo nhân vật`;
    return p.role === 'dm'
      ? `- ${label}: Dungeon Master, kể chuyện và đóng mọi NPC`
      : `- ${label}: người chơi ${p.name}, nhân vật ${p.character}`;
  });
  return rows.join('\n') || '- (chưa có thông tin)';
}

/** Làm sạch transcript theo từng phần, rồi viết recap và ghi chú. Có cache để chạy tiếp khi bị ngắt. */
export async function runLlm(sessionDir, { onProgress = () => {}, log = console } = {}) {
  const rawFile = path.join(sessionDir, 'transcript_raw.md');
  const raw = fs.readFileSync(rawFile, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => LINE_RE.test(l));
  if (!lines.length) throw new Error('transcript_raw.md không có dòng nào để xử lý');

  const cacheDir = path.join(sessionDir, 'llm_cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  const prompts = Object.fromEntries(
    ['clean', 'recap', 'notes'].map((n) => [n, fs.readFileSync(path.join(config.promptsDir, `${n}.md`), 'utf8')]),
  );
  const common = {
    players: describePlayers(sessionDir),
    glossary: loadGlossary().map((g) => `- ${g}`).join('\n') || '- (chưa có)',
  };

  const chunks = chunkLines(lines, config.llmChunkChars);
  const totalSteps = chunks.length + 2;
  const cleaned = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const cacheFile = path.join(cacheDir, `clean_${String(i).padStart(3, '0')}.md`);
    let out;
    if (fs.existsSync(cacheFile)) {
      out = fs.readFileSync(cacheFile, 'utf8');
    } else {
      const previous = cleaned.length ? cleaned.at(-1).split('\n').slice(-8).join('\n') : '(đây là đoạn đầu tiên)';
      out = await callLlm(fill(prompts.clean, { ...common, previous, chunk: chunks[i].join('\n') }), { log });
      const kept = out.split('\n').filter((l) => /^\[(IC|OOC)\]\s*\[\d{2}:\d{2}:\d{2}\]|^\[\d{2}:/.test(l.trim()));
      if (!kept.length) {
        log.warn(`[llm] phần ${i + 1} trả về sai định dạng, giữ bản thô`);
        out = chunks[i].join('\n');
      }
      fs.writeFileSync(cacheFile, out, 'utf8');
    }
    cleaned.push(out);
    onProgress(i + 1, totalSteps, `làm sạch phần ${i + 1}/${chunks.length}`);
  }

  const meta = readJson(path.join(sessionDir, 'session.json'), {});
  const cleanText = cleaned.join('\n');
  const cleanFile = path.join(sessionDir, 'transcript_clean.md');
  fs.writeFileSync(
    cleanFile,
    `# Transcript đã biên tập: session ${meta.id ?? path.basename(sessionDir)}\n\n` +
      '`[IC]` lời trong vai, `[OOC]` chuyện ngoài lề.\n\n---\n\n' +
      cleanText +
      '\n',
    'utf8',
  );

  const outputs = { cleanFile };
  for (const [step, name] of [
    [chunks.length + 1, 'recap'],
    [chunks.length + 2, 'notes'],
  ]) {
    const file = path.join(sessionDir, `${name}.md`);
    if (!fs.existsSync(file)) {
      const text = await callLlm(fill(prompts[name], { ...common, transcript: cleanText }), { log });
      fs.writeFileSync(file, text + '\n', 'utf8');
    }
    outputs[`${name}File`] = file;
    onProgress(step, totalSteps, name === 'recap' ? 'viết recap' : 'trích ghi chú');
  }
  return outputs;
}

export function latestSessionDir() {
  if (!fs.existsSync(config.sessionsDir)) return null;
  const dirs = fs
    .readdirSync(config.sessionsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  return dirs.length ? path.join(config.sessionsDir, dirs.at(-1)) : null;
}

export function resolveSessionDir(idOrPath) {
  if (!idOrPath) return latestSessionDir();
  if (fs.existsSync(idOrPath)) return path.resolve(idOrPath);
  const dir = path.join(config.sessionsDir, idOrPath);
  return fs.existsSync(dir) ? dir : null;
}
