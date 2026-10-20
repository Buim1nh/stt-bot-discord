import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const env = (key, fallback = '') => {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
};
const envInt = (key, fallback) => Number.parseInt(env(key, String(fallback)), 10);
const fromRoot = (p) => (path.isAbsolute(p) ? p : path.join(ROOT, p));

export const config = {
  token: env('DISCORD_TOKEN'),
  clientId: env('DISCORD_CLIENT_ID'),
  guildId: env('DISCORD_GUILD_ID'),
  dmRoleId: env('DM_ROLE_ID'),

  silenceMs: envInt('SILENCE_MS', 1200),
  maxSegmentMs: envInt('MAX_SEGMENT_MS', 90000),
  minSegmentMs: envInt('MIN_SEGMENT_MS', 400),
  sessionsDir: fromRoot(env('SESSIONS_DIR', 'sessions')),

  pythonBin: fromRoot(env('PYTHON_BIN', 'stt/.venv/Scripts/python.exe')),
  sttScript: path.join(ROOT, 'stt', 'transcribe.py'),

  llmProvider: env('LLM_PROVIDER', 'claude'),
  llmModel: env('LLM_MODEL'),
  llmChunkChars: envInt('LLM_CHUNK_CHARS', 14000),
  llmTimeoutSec: envInt('LLM_TIMEOUT_SEC', 900),

  playersFile: path.join(ROOT, 'config', 'players.json'),
  glossaryFile: path.join(ROOT, 'config', 'glossary.txt'),
  optOutFile: path.join(ROOT, 'config', 'optout.json'),
  promptsDir: path.join(ROOT, 'prompts'),
};

export function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

export function loadPlayers() {
  const raw = readJson(config.playersFile, {});
  return Object.fromEntries(Object.entries(raw).filter(([id]) => /^\d+$/.test(id)));
}

/** Tên ghi trong transcript: "Thorin (Minh)", "DM (An)" hoặc tên Discord nếu chưa khai báo. */
export function speakerLabel(userId, players, fallbackName) {
  const p = players[userId];
  if (!p) return fallbackName || `User ${userId}`;
  if (p.role === 'dm') return `DM (${p.name})`;
  return p.character ? `${p.character} (${p.name})` : p.name;
}

export function loadGlossary() {
  if (!fs.existsSync(config.glossaryFile)) return [];
  return fs
    .readFileSync(config.glossaryFile, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

export const optOut = {
  load: () => new Set(readJson(config.optOutFile, [])),
  save: (set) => writeJson(config.optOutFile, [...set]),
};
