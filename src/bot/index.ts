import { Telegraf } from 'telegraf';
import { env } from '../config/env';

const bot = new Telegraf(env.BOT_TOKEN);

bot.start((ctx) => {
  return ctx.reply('Бот успішно запущено.');
});

bot.launch();

console.log('Bot is running...');