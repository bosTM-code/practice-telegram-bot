import { Telegraf, Context, Input } from 'telegraf';
import { isAdmin } from '../utils/auth';
import { logEvent } from '../utils/logger';
import { isNonEmptyText, isValidDeadline } from '../utils/validators';
import { createTask } from '../services/task.service';
import { getAllReports, getReportsForExport } from '../services/report.service';
import { findUserByTelegramId } from '../services/user.service';

function getCommandPayload(text: string, command: string): string {
  return text.replace(command, '').trim();
}

function escapeCsvValue(value: string): string {
  const safe = value.replace(/"/g, '""');
  return `"${safe}"`;
}

export function registerAdminCommands(bot: Telegraf<Context>): void {
  bot.command('addtask', async (ctx) => {
    try {
      if (!isAdmin(ctx.from.id)) {
        await logEvent('warn', 'Спроба доступу до /addtask без прав', `telegram_id=${ctx.from.id}`);
        return ctx.reply('Ця команда доступна тільки керівнику практики.');
      }

      const adminUser = await findUserByTelegramId(ctx.from.id);
      if (!adminUser) {
        return ctx.reply('Адміністратор не зареєстрований у системі.');
      }

      const raw = getCommandPayload(ctx.message.text, '/addtask');
      const parts = raw.split('|').map((item) => item.trim());

      if (parts.length !== 3) {
        return ctx.reply('Формат: /addtask Назва | Опис | 2026-05-20');
      }

      const [title, description, deadline] = parts;

      if (!isNonEmptyText(title) || !isNonEmptyText(description)) {
        return ctx.reply('Назва та опис задачі не можуть бути порожніми.');
      }

      if (!isValidDeadline(deadline)) {
        return ctx.reply('Введіть коректний дедлайн у форматі YYYY-MM-DD.');
      }

      await createTask(title, description, deadline, adminUser.id);
      await logEvent('info', 'Створено нову задачу', `telegram_id=${ctx.from.id}`);

      return ctx.reply('Задачу успішно створено.');
    } catch (error) {
      await logEvent('error', 'Помилка під час /addtask', String(error));
      return ctx.reply('Не вдалося створити задачу.');
    }
  });

  bot.command('reports', async (ctx) => {
    try {
      if (!isAdmin(ctx.from.id)) {
        await logEvent('warn', 'Спроба доступу до /reports без прав', `telegram_id=${ctx.from.id}`);
        return ctx.reply('Ця команда доступна тільки керівнику практики.');
      }

      const reports = await getAllReports();
      await logEvent('info', 'Адміністратор виконав /reports', `telegram_id=${ctx.from.id}`);

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

  bot.command('export', async (ctx) => {
    try {
      if (!isAdmin(ctx.from.id)) {
        await logEvent('warn', 'Спроба доступу до /export без прав', `telegram_id=${ctx.from.id}`);
        return ctx.reply('Ця команда доступна тільки керівнику практики.');
      }

      const rows = await getReportsForExport();
      await logEvent('info', 'Адміністратор виконав /export', `telegram_id=${ctx.from.id}`);

      if (rows.length <= 1) {
        return ctx.reply('Немає даних для експорту.');
      }

      const csvContent = rows
        .map((row) => row.map((cell) => escapeCsvValue(String(cell))).join(','))
        .join('\n');

      const buffer = Buffer.from(csvContent, 'utf-8');

      return ctx.replyWithDocument(
        Input.fromBuffer(buffer, 'reports.csv'),
        {
          caption: 'Експорт звітів у CSV'
        }
      );
    } catch (error) {
      await logEvent('error', 'Помилка під час /export', String(error));
      return ctx.reply('Не вдалося виконати експорт.');
    }
  });
}