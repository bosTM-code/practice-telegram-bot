import { Telegraf } from 'telegraf';
import { env } from '../config/env';
import { initDatabase } from '../db/connection';
import { logEvent } from '../utils/logger';
import { isAdmin } from '../utils/auth';
import { isNonEmptyText, isValidFullName, isValidGroupName } from '../utils/validators';
import { registerUser } from '../services/user.service';
import { getActiveTasks, createTask } from '../services/task.service';
import { saveDailyReport, getAllReports } from '../services/report.service';

const bot = new Telegraf(env.BOT_TOKEN);

bot.start(async (ctx) => {
  await logEvent('info', 'Користувач виконав /start', `telegram_id=${ctx.from.id}`);
  return ctx.reply(
    'Вітаю! Я бот для обліку практики.\n' +
    'Команди:\n' +
    '/register ПІБ | Група\n' +
    '/tasks\n' +
    '/report текст звіту\n' +
    '/help'
  );
});

bot.command('help', async (ctx) => {
  return ctx.reply(
    'Доступні команди:\n' +
    '/register ПІБ | Група\n' +
    '/tasks\n' +
    '/report текст звіту\n' +
    '/myid'
  );
});

bot.command('myid', async (ctx) => {
  return ctx.reply(`Ваш Telegram ID: ${ctx.from.id}`);
});

bot.command('register', async (ctx) => {
  try {
    const raw = ctx.message.text.replace('/register', '').trim();
    const parts = raw.split('|').map((item) => item.trim());

    if (parts.length !== 2) {
      return ctx.reply('Формат: /register ПІБ | Група');
    }

    const [fullName, groupName] = parts;

    if (!isValidFullName(fullName)) {
      return ctx.reply('Введіть коректне ПІБ.');
    }

    if (!isValidGroupName(groupName)) {
      return ctx.reply('Введіть коректну назву групи.');
    }

    const result = await registerUser(ctx.from.id, fullName, groupName);

    if (result.created) {
      await logEvent('info', 'Користувача зареєстровано', `telegram_id=${ctx.from.id}`);
      return ctx.reply('Реєстрацію успішно завершено.');
    }

    return ctx.reply('Ви вже зареєстровані в системі.');
  } catch (error) {
    await logEvent('error', 'Помилка під час /register', String(error));
    return ctx.reply('Сталася помилка під час реєстрації.');
  }
});

bot.command('tasks', async (ctx) => {
  try {
    const tasks = await getActiveTasks();

    if (tasks.length === 0) {
      return ctx.reply('Наразі актуальних задач немає.');
    }

    const text = tasks
      .map(
        (task) =>
          `#${task.id}\n` +
          `Назва: ${task.title}\n` +
          `Опис: ${task.description}\n` +
          `Дедлайн: ${task.deadline}\n` +
          `Статус: ${task.status}`
      )
      .join('\n\n');

    return ctx.reply(text);
  } catch (error) {
    await logEvent('error', 'Помилка під час /tasks', String(error));
    return ctx.reply('Не вдалося отримати список задач.');
  }
});

bot.command('report', async (ctx) => {
  try {
    const text = ctx.message.text.replace('/report', '').trim();

    if (!isNonEmptyText(text)) {
      return ctx.reply('Будь ласка, додайте текст звіту після /report.');
    }

    await saveDailyReport(ctx.from.id, text);
    await logEvent('info', 'Звіт збережено', `telegram_id=${ctx.from.id}`);
    return ctx.reply('Звіт збережено. Дякую!');
  } catch (error) {
    await logEvent('error', 'Помилка під час /report', String(error));
    return ctx.reply(String(error).includes('не зареєстрований')
      ? 'Спочатку виконайте /register.'
      : 'Не вдалося зберегти звіт.');
  }
});

bot.command('addtask', async (ctx) => {
  try {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('Ця команда доступна тільки керівнику практики.');
    }

    const raw = ctx.message.text.replace('/addtask', '').trim();
    const parts = raw.split('|').map((item) => item.trim());

    if (parts.length !== 3) {
      return ctx.reply('Формат: /addtask Назва | Опис | 2026-05-13');
    }

    const [title, description, deadline] = parts;

    if (!title || !description || !deadline) {
      return ctx.reply('Усі поля задачі повинні бути заповнені.');
    }

    await createTask(title, description, deadline, 1);
    await logEvent('info', 'Створено задачу', `telegram_id=${ctx.from.id}`);
    return ctx.reply('Задачу успішно створено.');
  } catch (error) {
    await logEvent('error', 'Помилка під час /addtask', String(error));
    return ctx.reply('Не вдалося створити задачу.');
  }
});

bot.command('reports', async (ctx) => {
  try {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('Ця команда доступна тільки керівнику практики.');
    }

    const reports = await getAllReports();

    if (reports.length === 0) {
      return ctx.reply('Звітів поки немає.');
    }

    const text = reports
      .slice(0, 10)
      .map(
        (report) =>
          `${report.full_name} (${report.group_name})\n` +
          `Дата: ${report.report_date}\n` +
          `Звіт: ${report.text}`
      )
      .join('\n\n');

    return ctx.reply(text);
  } catch (error) {
    await logEvent('error', 'Помилка під час /reports', String(error));
    return ctx.reply('Не вдалося отримати звіти.');
  }
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