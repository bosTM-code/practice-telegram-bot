import dotenv from 'dotenv';

dotenv.config();

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Не задано змінну середовища: ${name}`);
  }
  return value;
}

function parseAdminIds(value: string): number[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '')
    .map((item) => Number(item))
    .filter((item) => !Number.isNaN(item));
}

export const env = {
  BOT_TOKEN: getEnv('BOT_TOKEN'),
  DATABASE_URL: getEnv('DATABASE_URL'),
  ADMIN_IDS: parseAdminIds(getEnv('ADMIN_IDS'))
};