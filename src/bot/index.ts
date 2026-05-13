import { Telegraf } from 'telegraf';
import { env } from '../config/env';
import { initDatabase } from '../db/connection';

const bot = new Telegraf(env.BOT_TOKEN);

bot.start((ctx) => {
  return ctx.reply('Бот успішно запущено.');
});

async function startBot() {
  try {
    await initDatabase();
    await bot.launch();
    console.log('Bot is running...');
  } catch (error) {
    console.error('Помилка запуску застосунку:', error);
  }
}

startBot();