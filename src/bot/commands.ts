import { Telegraf, Context } from 'telegraf';
import { logEvent } from '../utils/logger';
import {
  isNonEmptyText,
  isValidFullName,
  isValidGroupName,
  parseTaskStatus
} from '../utils/validators';
import { registerUser } from '../services/user.service';
import {
  getActiveTasks,
  changeTaskStatusForUser
} from '../services/task.service';
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
      '/taskstatus ID | in_progress або done\n' +
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
      '/taskstatus ID | in_progress або done — зміна статусу задачі\n' +
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

  bot.command('taskstatus', async (ctx) => {
    try {
      const raw = getCommandPayload(ctx.message.text, '/taskstatus');
      const parts = raw.split('|').map((item) => item.trim());

      if (parts.length !== 2) {
        return ctx.reply(
          'Формат: /taskstatus ID | in_progress\n' +
          'або /taskstatus ID | done'
        );
      }

      const taskId = Number(parts[0]);
      if (!Number.isInteger(taskId) || taskId <= 0) {
        return ctx.reply('Вкажіть коректний ID задачі.');
      }

      const parsedStatus = parseTaskStatus(parts[1]);
      if (!parsedStatus) {
        return ctx.reply(
          'Допустимі статуси: in_progress, done,\n' +
          'або українською: у процесі, виконано.'
        );
      }

      const updatedTask = await changeTaskStatusForUser(
        ctx.from.id,
        taskId,
        parsedStatus
      );

      const statusLabel =
        updatedTask.status === 'in_progress' ? 'у процесі' : 'виконано';

      await logEvent(
        'info',
        'Користувач змінив статус задачі',
        `telegram_id=${ctx.from.id}; task_id=${taskId}; status=${updatedTask.status}`
      );

      return ctx.reply(
        `Статус задачі #${updatedTask.id} оновлено.\n` +
        `Новий статус: ${statusLabel}.`
      );
    } catch (error) {
      await logEvent('error', 'Помилка під час /taskstatus', String(error));

      if (String(error).includes('не зареєстрований')) {
        return ctx.reply('Спочатку виконайте /register.');
      }

      if (String(error).includes('не знайдено')) {
        return ctx.reply('Задачу з таким ID не знайдено.');
      }

      return ctx.reply('Не вдалося змінити статус задачі.');
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