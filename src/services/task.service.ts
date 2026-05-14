import { getAll, getOne, runInsert, runQuery } from '../db/connection';
import { findUserByTelegramId } from './user.service';

export type TaskStatus = 'new' | 'in_progress' | 'done';

export interface Task {
  id: number;
  title: string;
  description: string;
  deadline: string;
  status: TaskStatus;
  created_by: number;
  created_at: string;
}

export async function createTask(
  title: string,
  description: string,
  deadline: string,
  createdBy: number
): Promise<number> {
  return runInsert(
    `INSERT INTO tasks (title, description, deadline, status, created_by)
     VALUES (?, ?, ?, 'new', ?)`,
    [title, description, deadline, createdBy]
  );
}

export async function getAllTasks(): Promise<Task[]> {
  return getAll<Task>(
    `SELECT * FROM tasks ORDER BY deadline ASC, id DESC`
  );
}

export async function getTaskById(taskId: number): Promise<Task | undefined> {
  return getOne<Task>(
    `SELECT * FROM tasks WHERE id = ?`,
    [taskId]
  );
}

export async function updateTaskStatus(
  taskId: number,
  status: TaskStatus
): Promise<void> {
  await runQuery(
    `UPDATE tasks SET status = ? WHERE id = ?`,
    [status, taskId]
  );
}

export async function getActiveTasks(): Promise<Task[]> {
  return getAll<Task>(
    `SELECT * FROM tasks
     WHERE status IN ('new', 'in_progress')
     ORDER BY deadline ASC, id DESC`
  );
}

export async function changeTaskStatusForUser(
  telegramId: number,
  taskId: number,
  status: 'in_progress' | 'done'
): Promise<Task> {
  const user = await findUserByTelegramId(telegramId);

  if (!user) {
    throw new Error('Користувач не зареєстрований у системі.');
  }

  const task = await getTaskById(taskId);

  if (!task) {
    throw new Error('Задачу не знайдено.');
  }

  await updateTaskStatus(taskId, status);

  const updatedTask = await getTaskById(taskId);

  if (!updatedTask) {
    throw new Error('Не вдалося оновити статус задачі.');
  }

  return updatedTask;
}