import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import {
  joinVoiceChannel,
  entersState,
  EndBehaviorType,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { config, writeJson } from './config.js';
import { OggOpusWriter } from './ogg.js';

const pad = (n, w = 2) => String(n).padStart(w, '0');

export function newSessionId(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}`;
}

/**
 * Ghi âm một kênh voice. Mỗi lượt nói của mỗi người là một file .ogg (Opus gốc, không decode lại)
 * đặt tên theo mốc thời gian tính từ lúc bắt đầu session, nên ghép lại được đúng thứ tự.
 */
export class SessionRecorder {
  constructor({ channel, optOutIds, log = console }) {
    this.channel = channel;
    this.optOutIds = optOutIds;
    this.log = log;
    this.id = newSessionId();
    this.dir = path.join(config.sessionsDir, this.id);
    this.audioDir = path.join(this.dir, 'audio');
    this.segmentsFile = path.join(this.dir, 'segments.jsonl');
    this.active = new Map(); // userId -> { stream, timer }
    this.speakers = {};
    this.segmentCount = 0;
    this.stopped = false;
  }

  get metaFile() {
    return path.join(this.dir, 'session.json');
  }

  async start() {
    fs.mkdirSync(this.audioDir, { recursive: true });
    const { channel } = this;

    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false, // phải không bị deafen thì mới nhận được audio
      selfMute: true,
    });

    this.connection.on('error', (err) => this.log.error('[voice] lỗi kết nối:', err));
    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      if (this.stopped) return;
      try {
        // Bị kick/đổi kênh/rớt mạng: cho 5 giây để tự kết nối lại
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        this.log.warn('[voice] mất kết nối hẳn, dừng ghi âm');
        await this.stop();
      }
    });

    await entersState(this.connection, VoiceConnectionStatus.Ready, 30_000);
    this.startedAt = Date.now();
    this.saveMeta();

    this.connection.receiver.speaking.on('start', (userId) => this.safeSpeak(userId));
    this.log.info(`[rec] bắt đầu session ${this.id} ở kênh #${channel.name}`);
  }

  saveMeta() {
    writeJson(this.metaFile, {
      id: this.id,
      guildId: this.channel.guild.id,
      channelId: this.channel.id,
      channelName: this.channel.name,
      startedAt: new Date(this.startedAt).toISOString(),
      endedAt: this.endedAt ? new Date(this.endedAt).toISOString() : null,
      speakers: this.speakers,
      segmentCount: this.segmentCount,
    });
  }

  async rememberSpeaker(userId) {
    if (this.speakers[userId]) return true;
    let member = this.channel.guild.members.cache.get(userId);
    if (!member) member = await this.channel.guild.members.fetch(userId).catch(() => null);
    if (member?.user.bot) return false;
    this.speakers[userId] = {
      displayName: member?.displayName ?? userId,
      username: member?.user.username ?? null,
    };
    this.saveMeta();
    return true;
  }

  safeSpeak(userId) {
    this.onSpeak(userId).catch((err) => {
      this.active.delete(userId);
      this.log.error(`[rec] lỗi khi ghi giọng ${userId}:`, err);
    });
  }

  async onSpeak(userId) {
    if (this.stopped || this.active.has(userId) || this.optOutIds.has(userId)) return;
    this.active.set(userId, null); // giữ chỗ ngay để không mở 2 stream song song
    if (!(await this.rememberSpeaker(userId))) {
      this.active.delete(userId);
      return;
    }
    if (this.stopped) {
      this.active.delete(userId);
      return;
    }

    const receiver = this.connection.receiver;
    const startMs = Date.now() - this.startedAt;
    const file = path.join(this.audioDir, `${pad(startMs, 9)}_${userId}.ogg`);

    const opusStream = receiver.subscribe(userId, {
      end: { behavior: EndBehaviorType.AfterSilence, duration: config.silenceMs },
    });
    const ogg = new OggOpusWriter({ channels: 2 });

    // Nói liền một mạch quá lâu (hoặc mic để mở) thì cắt đoạn, rồi mở đoạn mới ngay
    let forcedCut = false;
    const timer = setTimeout(() => {
      forcedCut = true;
      opusStream.push(null);
    }, config.maxSegmentMs);
    this.active.set(userId, { stream: opusStream, timer });

    try {
      await pipeline(opusStream, ogg, fs.createWriteStream(file));
    } catch (err) {
      if (!this.stopped) this.log.warn(`[rec] đoạn ${path.basename(file)} lỗi: ${err.message}`);
    } finally {
      clearTimeout(timer);
      this.active.delete(userId);
      // Thời điểm kết thúc thực tế đã trừ khoảng im lặng chờ cắt
      const trailingSilence = forcedCut || this.stopped ? 0 : config.silenceMs;
      const endMs = Math.max(startMs, Date.now() - this.startedAt - trailingSilence);
      this.finishSegment({ file, userId, startMs, endMs });
    }

    if (!this.stopped && receiver.speaking.users.has(userId)) this.safeSpeak(userId);
  }

  finishSegment({ file, userId, startMs, endMs }) {
    let size = 0;
    try {
      size = fs.statSync(file).size;
    } catch {
      return;
    }
    if (endMs - startMs < config.minSegmentMs || size < 2048) {
      fs.rmSync(file, { force: true });
      return;
    }
    this.segmentCount += 1;
    const line = JSON.stringify({ file: `audio/${path.basename(file)}`, userId, startMs, endMs });
    fs.appendFileSync(this.segmentsFile, line + '\n', 'utf8');
  }

  async stop() {
    if (this.stopped) return;
    this.stopped = true;
    // Đóng các đoạn đang ghi dở cho file ogg được kết thúc đúng chuẩn
    const pending = [...this.active.values()].filter(Boolean);
    for (const { stream } of pending) stream.push(null);
    await new Promise((resolve) => setTimeout(resolve, 500));
    this.endedAt = Date.now();
    this.saveMeta();
    try {
      this.connection?.destroy();
    } catch {
      /* đã destroy */
    }
    this.log.info(`[rec] kết thúc session ${this.id}: ${this.segmentCount} đoạn`);
  }

  status() {
    const minutes = Math.round((Date.now() - this.startedAt) / 60000);
    return {
      id: this.id,
      minutes,
      segments: this.segmentCount,
      speakers: Object.values(this.speakers).map((s) => s.displayName),
    };
  }
}
