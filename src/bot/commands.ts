import { Telegraf, Context } from 'telegraf';
import { logEvent } from '../utils/logger';
import {
  isNonEmptyText,
  isValidFullName,
  isValidGroupName
} from '../utils/validators';
import { registerUser } from '../services/user.service';
import { getActiveTasks } from '../services/task.service';
import { saveDailyReport } from '../services/report.service';

function getCommandPayload(text: string, command: string): string {
  return text.replace(command, '').trim();
}

export function registerUserCommands(bot: Telegraf<Context>): void {
  bot.start(async (ctx) => {
    await logEvent('info', 'Користувач виконав /start', `telegram_id=${ctx.from.id}`);

    return ctx.reply(
      'Вітаю! Я бот для обліку практики.\n\n' +
      'Доступні команди:\n' +
      '/register ПІБ | Група\n' +
      '/tasks\n' +
      '/report текст звіту\n' +
      '/help'
    );
  });

  bot.command('help', async (ctx) => {
    await logEvent('info', 'Користувач виконав /help', `telegram_id=${ctx.from.id}`);

    return ctx.reply(
      'Доступні команди:\n' +
      '/register ПІБ | Група\n' +
      '/tasks — перегляд актуальних задач\n' +
      '/report текст — подання щоденного звіту\n' +
      '/help — довідка\n' +
      '/myid — показати Telegram ID'
    );
  });

  bot.command('myid', async (ctx) => {
    return ctx.reply(`Ваш Telegram ID: ${ctx.from.id}`);
  });

  bot.command('register', async (ctx) => {
    try {
      const raw = getCommandPayload(ctx.message.text, '/register');
      const parts = raw.split('|').map((item) => item.trim());

      if (parts.length !== 2) {
        return ctx.reply('Формат команди: /register ПІБ | Група');
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
      await logEvent('info', 'Користувач виконав /tasks', `telegram_id=${ctx.from.id}`);

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
      const text = getCommandPayload(ctx.message.text, '/report');

      if (!isNonEmptyText(text)) {
        await logEvent('warn', 'Користувач надіслав порожній /report', `telegram_id=${ctx.from.id}`);
        return ctx.reply('Будь ласка, додайте текст звіту після /report.');
      }

      await saveDailyReport(ctx.from.id, text);
      await logEvent('info', 'Звіт збережено', `telegram_id=${ctx.from.id}`);

      return ctx.reply('Звіт збережено. Дякую!');
    } catch (error) {
      await logEvent('error', 'Помилка під час /report', String(error));

      if (String(error).includes('не зареєстрований')) {
        return ctx.reply('Спочатку виконайте /register.');
      }

      return ctx.reply('Не вдалося зберегти звіт.');
    }
  });
}