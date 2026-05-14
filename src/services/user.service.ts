import { getOne, runInsert } from '../db/connection';

export type UserRole = 'student' | 'admin';

export interface User {
  id: number;
  telegram_id: number;
  full_name: string;
  group_name: string;
  role: UserRole;
  created_at: string;
}

export async function findUserByTelegramId(telegramId: number): Promise<User | undefined> {
  return getOne<User>(
    `SELECT * FROM users WHERE telegram_id = ?`,
    [telegramId]
  );
}

export async function createUser(
  telegramId: number,
  fullName: string,
  groupName: string,
  role: UserRole = 'student'
): Promise<number> {
  return runInsert(
    `INSERT INTO users (telegram_id, full_name, group_name, role)
     VALUES (?, ?, ?, ?)`,
    [telegramId, fullName, groupName, role]
  );
}

export async function registerUser(
  telegramId: number,
  fullName: string,
  groupName: string
): Promise<{ created: boolean; userId: number }> {
  const existingUser = await findUserByTelegramId(telegramId);

  if (existingUser) {
    return { created: false, userId: existingUser.id };
  }

  const userId = await createUser(telegramId, fullName, groupName, 'student');
  return { created: true, userId };
}