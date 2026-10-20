import fs from 'node:fs';
import path from 'node:path';
import { AttachmentBuilder, Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { config, optOut } from './config.js';
import { SessionRecorder } from './recorder.js';
import { resolveSessionDir, runLlm, runStt } from './pipeline.js';

if (!config.token) {
  console.error('Thiếu DISCORD_TOKEN trong .env (copy từ .env.example)');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
const recorders = new Map(); // guildId -> SessionRecorder
const optOutIds = optOut.load();
let jobQueue = Promise.resolve(); // xử lý lần lượt từng session vì chỉ có một GPU

const ephemeral = { flags: MessageFlags.Ephemeral };

function canControl(member) {
  if (!config.dmRoleId) return true;
  return member.roles.cache.has(config.dmRoleId);
}

function splitMessage(text, max = 1900) {
  const parts = [];
  let current = '';
  for (const para of text.split(/\n(?=\n)|\n(?=#)/)) {
    if ((current + para).length > max && current) {
      parts.push(current.trim());
      current = '';
    }
    current += para.length > max ? para.slice(0, max) : para;
    current += '\n';
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** Chạy STT + LLM rồi đăng kết quả vào kênh text. Cập nhật một tin nhắn tiến độ, không spam. */
function processSession(sessionDir, textChannel) {
  const job = jobQueue.then(async () => {
    const id = path.basename(sessionDir);
    const status = await textChannel.send(`⏳ Đang xử lý session \`${id}\`...`);
    let lastEdit = 0;
    const update = (msg, force = false) => {
      if (!force && Date.now() - lastEdit < 5000) return;
      lastEdit = Date.now();
      status.edit(msg).catch(() => {});
    };

    try {
      const t0 = Date.now();
      await runStt(sessionDir, {
        onProgress: (d, t) => update(`🎧 Session \`${id}\`: chuyển giọng nói thành chữ ${d}/${t} đoạn`),
      });
      const sttMin = Math.round((Date.now() - t0) / 60000);

      let outputs = { rawFile: path.join(sessionDir, 'transcript_raw.md') };
      if (config.llmProvider !== 'none') {
        update(`✍️ Session \`${id}\`: STT xong (${sttMin} phút), đang biên tập bằng ${config.llmProvider}...`, true);
        outputs = {
          ...outputs,
          ...(await runLlm(sessionDir, {
            onProgress: (d, t, note) => update(`✍️ Session \`${id}\`: ${note} (${d}/${t})`),
          })),
        };
      }

      update(`✅ Session \`${id}\` xử lý xong sau ${Math.round((Date.now() - t0) / 60000)} phút.`, true);

      if (outputs.recapFile) {
        const recap = fs.readFileSync(outputs.recapFile, 'utf8');
        const parts = splitMessage(recap);
        for (const part of parts.slice(0, 4)) await textChannel.send(part);
        if (parts.length > 4) await textChannel.send('_(recap dài, xem đầy đủ trong file đính kèm)_');
      }
      const files = [outputs.recapFile, outputs.notesFile, outputs.cleanFile, outputs.rawFile]
        .filter((f) => f && fs.existsSync(f))
        .map((f) => new AttachmentBuilder(f, { name: `${id}_${path.basename(f)}` }));
      await textChannel.send({ content: `📎 File của session \`${id}\`:`, files });
    } catch (err) {
      console.error(err);
      update(
        `❌ Session \`${id}\` lỗi: ${err.message.slice(0, 1500)}\nAudio vẫn còn nguyên, sửa lỗi xong dùng \`/process session:${id}\` để chạy lại.`,
        true,
      );
    }
  });
  jobQueue = job.catch(() => {});
  return job;
}

async function handleRecord(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  const current = recorders.get(guildId);

  if (sub === 'status') {
    if (!current) return interaction.reply({ content: 'Hiện không ghi âm.', ...ephemeral });
    const s = current.status();
    return interaction.reply({
      content: `🔴 Đang ghi session \`${s.id}\`: ${s.minutes} phút, ${s.segments} đoạn. Người nói: ${s.speakers.join(', ') || '(chưa ai)'}`,
      ...ephemeral,
    });
  }

  if (!canControl(interaction.member)) {
    return interaction.reply({ content: 'Chỉ DM mới được bật/tắt ghi âm.', ...ephemeral });
  }

  if (sub === 'start') {
    if (current) return interaction.reply({ content: `Đang ghi session \`${current.id}\` rồi.`, ...ephemeral });
    const channel = interaction.member.voice?.channel;
    if (!channel) return interaction.reply({ content: 'Bạn cần vào kênh voice trước.', ...ephemeral });

    await interaction.deferReply();
    const recorder = new SessionRecorder({ channel, optOutIds });
    try {
      await recorder.start();
    } catch (err) {
      await recorder.stop().catch(() => {});
      return interaction.editReply(`Không vào được kênh voice: ${err.message}`);
    }
    recorders.set(guildId, recorder);
    return interaction.editReply(
      `🔴 **Bắt đầu ghi âm** kênh **${channel.name}** (session \`${recorder.id}\`).\n` +
        'Giọng nói của mọi người trong kênh sẽ được ghi lại để làm transcript và recap cho buổi chơi. ' +
        'Ai không muốn bị ghi thì gõ `/optout`.',
    );
  }

  if (sub === 'stop') {
    if (!current) return interaction.reply({ content: 'Hiện không ghi âm.', ...ephemeral });
    await interaction.deferReply();
    await current.stop();
    recorders.delete(guildId);
    const s = current.status();
    const shouldProcess = interaction.options.getBoolean('process') ?? true;
    await interaction.editReply(
      `⏹️ Đã dừng ghi session \`${s.id}\`: ${s.segments} đoạn audio.` +
        (shouldProcess ? ' Bắt đầu xử lý, xong mình sẽ đăng recap ở đây.' : ` Khi nào cần thì dùng \`/process session:${s.id}\`.`),
    );
    if (s.segments > 0 && shouldProcess) processSession(current.dir, interaction.channel);
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  try {
    switch (interaction.commandName) {
      case 'record':
        return await handleRecord(interaction);
      case 'process': {
        const id = interaction.options.getString('session');
        const dir = resolveSessionDir(id);
        if (!dir) return interaction.reply({ content: `Không tìm thấy session \`${id ?? '(mới nhất)'}\`.`, ...ephemeral });
        if ([...recorders.values()].some((r) => r.dir === dir)) {
          return interaction.reply({ content: 'Session này đang ghi, dừng trước đã.', ...ephemeral });
        }
        await interaction.reply(`Đã xếp hàng xử lý session \`${path.basename(dir)}\`.`);
        processSession(dir, interaction.channel);
        return;
      }
      case 'optout':
        optOutIds.add(interaction.user.id);
        optOut.save(optOutIds);
        return interaction.reply({ content: 'Đã ghi nhận: bot sẽ không ghi giọng của bạn nữa.', ...ephemeral });
      case 'optin':
        optOutIds.delete(interaction.user.id);
        optOut.save(optOutIds);
        return interaction.reply({ content: 'Đã bật lại ghi âm cho giọng của bạn.', ...ephemeral });
      default:
        return undefined;
    }
  } catch (err) {
    console.error(err);
    const msg = { content: `Lỗi: ${err.message}`, ...ephemeral };
    if (interaction.deferred || interaction.replied) await interaction.followUp(msg).catch(() => {});
    else await interaction.reply(msg).catch(() => {});
  }
});

client.once(Events.ClientReady, (c) => console.log(`Bot đã online: ${c.user.tag}`));

// Tắt bot (Ctrl+C) thì đóng file ghi âm đàng hoàng; audio đã ghi xử lý sau bằng /process hoặc npm run process
async function shutdown() {
  console.log('Đang tắt, đóng các session đang ghi...');
  await Promise.all([...recorders.values()].map((r) => r.stop().catch(() => {})));
  await client.destroy();
  process.exit(0);
}
// Lỗi bất ngờ ở một chỗ không được làm sập cả bot giữa buổi chơi
process.on('unhandledRejection', (err) => console.error('[bot] lỗi không bắt được:', err));
process.on('uncaughtException', (err) => console.error('[bot] lỗi không bắt được:', err));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

client.login(config.token);
