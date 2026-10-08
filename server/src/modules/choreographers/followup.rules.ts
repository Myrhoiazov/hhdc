// Pure rules for task reminders.

export interface ReminderTask { id: string; title: string; status: string; dueDate: Date | null; reminderSentAt: Date | null; assigneeId: string | null; createdBy: string | null; personId: string | null }

export const REMINDER_WINDOW_MS = 24 * 60 * 60_000;
const OPEN = ['TODO', 'IN_PROGRESS'];

// A reminder goes out once, when an open task is due within a day or already overdue.
export const needsReminder = (task: ReminderTask, now: Date): boolean =>
    OPEN.includes(task.status) && task.dueDate !== null && task.reminderSentAt === null && task.dueDate.getTime() - now.getTime() <= REMINDER_WINDOW_MS;

// The assignee is reminded; an unassigned task reminds whoever created it. Staff only — a
// choreographer is never notified from here.
export const reminderRecipient = (task: ReminderTask): string | null => task.assigneeId ?? task.createdBy;

export const reminderLink = (task: ReminderTask): string => (task.personId ? `/people/choreographers/${task.personId}/notes` : '/operations');

export const reminderTitle = (task: ReminderTask, now: Date): string =>
    `${task.dueDate && task.dueDate < now ? 'Task overdue' : 'Task due soon'}: ${task.title}`.slice(0, 200);
