import { getAll, runInsert } from '../db/connection';
import { findUserByTelegramId } from './user.service';

export interface Report {
  id: number;
  user_id: number;
  report_date: string;
  text: string;
  created_at: string;
}

export interface ReportWithUser {
  id: number;
  user_id: number;
  report_date: string;
  text: string;
  created_at: string;
  full_name: string;
  group_name: string;
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export async function saveDailyReport(
  telegramId: number,
  text: string
): Promise<number> {
  const user = await findUserByTelegramId(telegramId);

  if (!user) {
    throw new Error('Користувач не зареєстрований у системі.');
  }

  return runInsert(
    `INSERT INTO reports (user_id, report_date, text)
     VALUES (?, ?, ?)`,
    [user.id, getTodayDate(), text]
  );
}

export async function getAllReports(): Promise<ReportWithUser[]> {
  return getAll<ReportWithUser>(
    `SELECT
       reports.id,
       reports.user_id,
       reports.report_date,
       reports.text,
       reports.created_at,
       users.full_name,
       users.group_name
     FROM reports
     INNER JOIN users ON reports.user_id = users.id
     ORDER BY reports.report_date DESC, reports.id DESC`
  );
}