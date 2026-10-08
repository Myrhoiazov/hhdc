import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needsReminder, reminderLink, reminderRecipient, reminderTitle, type ReminderTask } from './followup.rules';
import { noteSchema, noteUpdateSchema, taskSchema } from './followup.service';

const now = new Date('2026-10-09T09:00:00Z');
const task = (overrides: Partial<ReminderTask>): ReminderTask => ({
    id: 't1', title: 'Send contract', status: 'TODO', dueDate: new Date('2026-10-09T18:00:00Z'), reminderSentAt: null, assigneeId: 'user-a', createdBy: 'user-c', personId: 'person-1', ...overrides,
});

test('an open task is reminded once, when it is due within a day or overdue', () => {
    assert.equal(needsReminder(task({}), now), true);
    assert.equal(needsReminder(task({ dueDate: new Date('2026-10-08T09:00:00Z') }), now), true);
    assert.equal(needsReminder(task({ dueDate: new Date('2026-10-12T09:00:00Z') }), now), false);
    assert.equal(needsReminder(task({ reminderSentAt: new Date('2026-10-09T08:00:00Z') }), now), false);
    assert.equal(needsReminder(task({ status: 'DONE' }), now), false);
    assert.equal(needsReminder(task({ dueDate: null }), now), false);
});

test('the reminder goes to staff: the assignee, or the creator of an unassigned task', () => {
    assert.equal(reminderRecipient(task({})), 'user-a');
    assert.equal(reminderRecipient(task({ assigneeId: null })), 'user-c');
    assert.equal(reminderRecipient(task({ assigneeId: null, createdBy: null })), null);
    assert.equal(reminderLink(task({})), '/people/choreographers/person-1/notes');
    assert.equal(reminderLink(task({ personId: null })), '/operations');
    assert.equal(reminderTitle(task({}), now), 'Task due soon: Send contract');
    assert.equal(reminderTitle(task({ dueDate: new Date('2026-10-08T09:00:00Z') }), now), 'Task overdue: Send contract');
});

test('a note needs text; a task needs a title and a known priority', () => {
    assert.equal(noteSchema.parse({ content: '  Prefers morning classes  ', isPinned: true }).content, 'Prefers morning classes');
    assert.throws(() => noteSchema.parse({ content: '   ' }));
    assert.throws(() => noteUpdateSchema.parse({ personId: 'x' }));
    assert.equal(taskSchema.parse({ title: 'Request updated photos' }).priority, 'NORMAL');
    assert.throws(() => taskSchema.parse({ title: '' }));
    assert.throws(() => taskSchema.parse({ title: 'x', priority: 'URGENT' }));
    assert.throws(() => taskSchema.parse({ title: 'x', dueDate: 'tomorrow' }));
});
