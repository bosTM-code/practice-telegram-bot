import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';

const dbPath = path.resolve(env.DATABASE_URL);

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Помилка підключення до бази даних:', err.message);
  } else {
    console.log('Підключення до SQLite успішне.');
  }
});

export function runQuery(sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function initDatabase(): Promise<void> {
  const sqlPath = path.resolve(__dirname, 'migrations.sql');
  const migrations = fs.readFileSync(sqlPath, 'utf-8');

  return new Promise((resolve, reject) => {
    db.exec(migrations, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Таблиці бази даних успішно створено.');
        resolve();
      }
    });
  });
}