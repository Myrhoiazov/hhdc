import { ChoreographerTask } from '@/entities/Choreographer';

// A date input gives a day; the task is due at the end of that day in the reader's time zone.
export const dueAtEndOfDay = (day: string): string | null =>
    day ? new Date(`${day}T23:59:00`).toISOString() : null;

export const isOpen = (task: ChoreographerTask) =>
    task.status === 'TODO' || task.status === 'IN_PROGRESS';

export const isOverdue = (task: ChoreographerTask, now = new Date()): boolean =>
    isOpen(task) && !!task.dueDate && new Date(task.dueDate) < now;
