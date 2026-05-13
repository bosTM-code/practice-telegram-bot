import { runQuery } from '../db/connection';

type LogLevel = 'info' | 'warn' | 'error';

export async function logEvent(
  level: LogLevel,
  message: string,
  context?: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, context ?? '');

  try {
    await runQuery(
      `INSERT INTO logs (level, message, context) VALUES (?, ?, ?)`,
      [level, message, context ?? null]
    );
  } catch (error) {
    console.error('Не вдалося записати лог у базу даних:', error);
  }
}