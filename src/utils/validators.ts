export function isNonEmptyText(value: string): boolean {
  return value.trim().length > 0;
}

export function isValidFullName(value: string): boolean {
  return value.trim().length >= 5;
}

export function isValidGroupName(value: string): boolean {
  return value.trim().length >= 2;
}

export function isValidDeadline(value: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export function isValidTaskStatus(value: string): boolean {
  return ['new', 'in_progress', 'done'].includes(value);
}

export function parseTaskStatus(
  value: string
): 'in_progress' | 'done' | null {
  const normalized = value.trim().toLowerCase();

  if (
    normalized === 'in_progress' ||
    normalized === 'in progress' ||
    normalized === 'у процесі' ||
    normalized === 'в процесі'
  ) {
    return 'in_progress';
  }

  if (
    normalized === 'done' ||
    normalized === 'виконано' ||
    normalized === 'готово'
  ) {
    return 'done';
  }

  return null;
}