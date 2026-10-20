import { SlashCommandBuilder } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('record')
    .setDescription('Ghi âm session D&D')
    .addSubcommand((s) => s.setName('start').setDescription('Vào kênh voice bạn đang ngồi và bắt đầu ghi âm'))
    .addSubcommand((s) =>
      s
        .setName('stop')
        .setDescription('Dừng ghi âm, rời kênh và xử lý thành văn bản')
        .addBooleanOption((o) => o.setName('process').setDescription('Xử lý ngay sau khi dừng (mặc định: có)')),
    )
    .addSubcommand((s) => s.setName('status').setDescription('Xem tình trạng ghi âm hiện tại')),
  new SlashCommandBuilder()
    .setName('process')
    .setDescription('Chạy lại STT + LLM cho một session đã ghi')
    .addStringOption((o) => o.setName('session').setDescription('Mã session, ví dụ 2026-10-20_2000. Bỏ trống = mới nhất')),
  new SlashCommandBuilder().setName('optout').setDescription('Không cho bot ghi âm giọng của bạn'),
  new SlashCommandBuilder().setName('optin').setDescription('Cho phép bot ghi âm giọng của bạn trở lại'),
].map((c) => c.toJSON());
