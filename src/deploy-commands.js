// Đăng ký slash command cho server (chạy lại mỗi khi sửa commands.js)
import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import { commands } from './commands.js';

if (!config.token || !config.clientId || !config.guildId) {
  console.error('Thiếu DISCORD_TOKEN, DISCORD_CLIENT_ID hoặc DISCORD_GUILD_ID trong .env');
  process.exit(1);
}

const rest = new REST().setToken(config.token);
await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
console.log(`Đã đăng ký ${commands.length} lệnh cho server ${config.guildId}`);
