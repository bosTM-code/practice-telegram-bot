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

export function runInsert(sql: string, params: unknown[] = []): Promise<number> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

export function getOne<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
}

export function getAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export function initDatabase(): Promise<void> {
  const sqlPath = path.resolve(__dirname, 'migrations.sql');
  const migrations = fs.readFileSync(sqlPath, 'utf-8');

  return new Promise((resolve, reject) => {
    db.exec(migrations, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}