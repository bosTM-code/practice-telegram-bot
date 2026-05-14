import { Telegraf } from 'telegraf';
import { env } from '../config/env';
import { initDatabase } from '../db/connection';
import { logEvent } from '../utils/logger';
import { registerUserCommands } from './commands';
import { registerAdminCommands } from './admin';

const bot = new Telegraf(env.BOT_TOKEN);

registerUserCommands(bot);
registerAdminCommands(bot);

async function startBot() {
  try {
    await initDatabase();
    await logEvent('info', 'Базу даних ініціалізовано');
    await bot.launch();
    await logEvent('info', 'Бот успішно запущено');
    console.log('Bot is running...');
  } catch (error) {
    console.error('Помилка запуску застосунку:', error);
    await logEvent('error', 'Помилка запуску застосунку', String(error));
  }
}

startBot();

process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await logEvent('error', 'Uncaught Exception', String(error));
});

process.on('unhandledRejection', async (reason) => {
  console.error('Unhandled Rejection:', reason);
  await logEvent('error', 'Unhandled Rejection', String(reason));
});