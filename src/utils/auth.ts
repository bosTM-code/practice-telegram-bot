import { env } from '../config/env';

export function isAdmin(telegramId: number): boolean {
  return env.ADMIN_IDS.includes(telegramId);
}