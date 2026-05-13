import { Telegraf } from 'telegraf';
import { env } from '../config/env';
import { initDatabase } from '../db/connection';
import { logEvent } from '../utils/logger';
import { isNonEmptyText } from '../utils/validators';
import { isAdmin } from '../utils/auth';

const bot = new Telegraf(env.BOT_TOKEN);

bot.start(async (ctx) => {
  await logEvent('info', 'Користувач виконав /start', `telegram_id=${ctx.from.id}`);
  return ctx.reply('Вітаю! Бот успішно запущено.');
});

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

bot.command('report', async (ctx) => {
  const text = ctx.message.text.replace('/report', '').trim();

  if (!isNonEmptyText(text)) {
    await logEvent('warn', 'Користувач надіслав порожній звіт', `telegram_id=${ctx.from.id}`);
    return ctx.reply('Будь ласка, додайте текст звіту після команди /report.');
  }

  await logEvent('info', 'Користувач надіслав тестовий звіт', `telegram_id=${ctx.from.id}`);
  return ctx.reply('Текст звіту прийнято. Збереження буде реалізовано на наступному етапі.');
});

bot.command('export', async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    await logEvent('warn', 'Спроба доступу до /export без прав', `telegram_id=${ctx.from.id}`);
    return ctx.reply('Ця команда доступна тільки керівнику практики.');
  }

  await logEvent('info', 'Адміністратор виконав /export', `telegram_id=${ctx.from.id}`);
  return ctx.reply('Перевірка прав успішна. Реалізація експорту буде додана далі.');
});

bot.command('myid', async (ctx) => {
  return ctx.reply(`Ваш Telegram ID: ${ctx.from.id}`);
});