import { TaskStatus } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { needsReminder, reminderLink, reminderRecipient, reminderTitle, REMINDER_WINDOW_MS } from './followup.rules';
import { assertChoreographer } from './profile.service';

export const noteSchema = z.object({
    content: z.string().trim().min(1).max(5000),
    isPinned: z.boolean().optional(),
    assignmentId: z.string().uuid().nullable().optional(),
}).strict();
export const noteUpdateSchema = z.object({ content: z.string().trim().min(1).max(5000).optional(), isPinned: z.boolean().optional() }).strict();

interface Actor { userId: string }

const withAuthors = async <T extends { createdById: string; updatedById: string | null }>(notes: T[]) => {
    const ids = Array.from(new Set(notes.flatMap(note => [note.createdById, ...(note.updatedById ? [note.updatedById] : [])])));
    const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    const name = (id: string | null) => users.find(user => user.id === id)?.name ?? null;
    return notes.map(note => ({ ...note, createdByName: name(note.createdById), updatedByName: name(note.updatedById) }));
};

export const listNotes = async (personId: string) => {
    await assertChoreographer(personId);
    return withAuthors(await prisma.choreographerNote.findMany({ where: { personId, deletedAt: null }, orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }], take: 200 }));
};

const assertOwnAssignment = async (personId: string, assignmentId: string | null | undefined) => {
    if (assignmentId && !(await prisma.eventChoreographer.count({ where: { id: assignmentId, personId } }))) throw new ApiError(400, 'ASSIGNMENT_MISMATCH', 'The assignment does not belong to this choreographer');
};

// The audit log records that a note was written and by whom, never its text.
export const addNote = async (personId: string, input: z.infer<typeof noteSchema>, actor: Actor) => {
    await assertChoreographer(personId);
    await assertOwnAssignment(personId, input.assignmentId);
    const note = await prisma.$transaction(async tx => {
        const created = await tx.choreographerNote.create({ data: { personId, content: input.content, isPinned: input.isPinned ?? false, assignmentId: input.assignmentId ?? null, createdById: actor.userId } });
        await tx.auditLog.create({ data: { actorUserId: actor.userId, action: 'CHOREOGRAPHER_NOTE_ADDED', entityType: 'ChoreographerNote', entityId: created.id } });
        return created;
    });
    return (await withAuthors([note]))[0];
};

const requireNote = async (personId: string, noteId: string) => {
    const note = await prisma.choreographerNote.findFirst({ where: { id: noteId, personId, deletedAt: null } });
    if (!note) throw new ApiError(404, 'NOTE_NOT_FOUND', 'Note not found');
    return note;
};

export const updateNote = async (personId: string, noteId: string, input: z.infer<typeof noteUpdateSchema>, actor: Actor) => {
    await requireNote(personId, noteId);
    const note = await prisma.$transaction(async tx => {
        const updated = await tx.choreographerNote.update({ where: { id: noteId }, data: { ...input, updatedById: actor.userId } });
        await tx.auditLog.create({ data: { actorUserId: actor.userId, action: 'CHOREOGRAPHER_NOTE_UPDATED', entityType: 'ChoreographerNote', entityId: noteId } });
        return updated;
    });
    return (await withAuthors([note]))[0];
};

export const removeNote = async (personId: string, noteId: string, actor: Actor) => {
    await requireNote(personId, noteId);
    await prisma.$transaction([
        prisma.choreographerNote.update({ where: { id: noteId }, data: { deletedAt: new Date(), updatedById: actor.userId } }),
        prisma.auditLog.create({ data: { actorUserId: actor.userId, action: 'CHOREOGRAPHER_NOTE_REMOVED', entityType: 'ChoreographerNote', entityId: noteId } }),
    ]);
    return { deleted: true };
};

export const taskSchema = z.object({
    title: z.string().trim().min(1).max(300),
    description: z.string().trim().max(2000).optional(),
    dueDate: z.string().datetime().nullable().optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH']).default('NORMAL'),
    eventId: z.string().uuid().nullable().optional(),
}).strict();

const TASK_FIELDS = { id: true, title: true, description: true, status: true, dueDate: true, priority: true, eventId: true, createdAt: true, assignee: { select: { id: true, name: true } } } as const;

// Follow-ups for this choreographer, open ones first by due date. They are ordinary tasks, so
// they also appear in Operations.
export const listTasks = async (personId: string) => {
    await assertChoreographer(personId);
    const tasks = await prisma.task.findMany({ where: { personId }, select: TASK_FIELDS, orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }], take: 200 });
    const open = (status: TaskStatus) => status === 'TODO' || status === 'IN_PROGRESS';
    return [...tasks.filter(task => open(task.status)), ...tasks.filter(task => !open(task.status))];
};

export const addTask = async (personId: string, input: z.infer<typeof taskSchema>, actor: Actor) => {
    await assertChoreographer(personId);
    return prisma.task.create({ select: TASK_FIELDS, data: {
        personId, title: input.title, description: input.description, priority: input.priority, eventId: input.eventId ?? null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null, assigneeId: input.assigneeId ?? actor.userId, createdBy: actor.userId,
    } });
};

// Sends the due-date reminders that are due now. Each task is claimed before its notification
// is written, so two overlapping sweeps cannot remind twice.
export const sendTaskReminders = async (now = new Date()): Promise<number> => {
    const due = await prisma.task.findMany({
        where: { status: { in: ['TODO', 'IN_PROGRESS'] }, reminderSentAt: null, dueDate: { not: null, lte: new Date(now.getTime() + REMINDER_WINDOW_MS) } },
        select: { id: true, title: true, status: true, dueDate: true, reminderSentAt: true, assigneeId: true, createdBy: true, personId: true }, take: 100,
    });
    let sent = 0;
    for (const task of due.filter(item => needsReminder(item, now))) {
        const userId = reminderRecipient(task);
        const claimed = await prisma.task.updateMany({ where: { id: task.id, reminderSentAt: null }, data: { reminderSentAt: now } });
        if (!claimed.count || !userId) continue;
        await prisma.notification.create({ data: { userId, type: 'TASK_REMINDER', title: reminderTitle(task, now), link: reminderLink(task) } });
        sent += 1;
    }
    return sent;
};

let lastReminderSweepAt = 0;
const REMINDER_SWEEP_MS = 15 * 60_000;
// Called from the worker tick, which runs far more often than reminders need checking.
export const sendTaskRemindersWhenDue = async (now = Date.now()): Promise<boolean> => {
    if (now - lastReminderSweepAt < REMINDER_SWEEP_MS) return false;
    lastReminderSweepAt = now;
    await sendTaskReminders(new Date(now));
    return true;
};
