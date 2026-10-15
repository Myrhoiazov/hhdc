import { renderAt, ALL, answerChoreographerRequests } from './ChoreographerPages.testHelpers';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
    addChoreographerNote,
    addChoreographerTask,
    ChoreographerTask,
    listChoreographerNotes,
    listChoreographerTasks,
    removeChoreographerNote,
    updateChoreographerNote,
} from '@/entities/Choreographer';
import { updateTaskStatus } from '@/entities/Operations';
import { dueAtEndOfDay, isOverdue } from '../model/followUps';

answerChoreographerRequests();

const NOTES = [
    ...ALL,
    'choreographers.notes.read',
    'choreographers.notes.manage',
    'tasks.read',
    'tasks.write',
];
const followUp = (overrides: Partial<ChoreographerTask>): ChoreographerTask => ({
    id: 'task-1',
    title: 'Send contract',
    description: null,
    status: 'TODO',
    priority: 'HIGH',
    dueDate: '2020-01-01T10:00:00.000Z',
    assignee: { id: 'u', name: 'Denis' },
    ...overrides,
});

test('notes are internal, pinned ones are marked, and a note can be added, pinned and removed', async () => {
    jest.mocked(listChoreographerNotes).mockResolvedValue([
        {
            id: 'n1',
            content: 'Needs a visa letter',
            isPinned: true,
            createdAt: '2026-10-01T10:00:00.000Z',
            updatedAt: '2026-10-01T10:00:00.000Z',
            createdByName: 'Denis',
        },
        {
            id: 'n2',
            content: 'Prefers morning classes',
            isPinned: false,
            createdAt: '2026-09-01T10:00:00.000Z',
            updatedAt: '2026-09-01T10:00:00.000Z',
            createdByName: null,
        },
    ]);
    renderAt('/people/choreographers/person-1/notes', NOTES);

    const pinned = await screen.findByRole('article', { name: 'Needs a visa letter' });
    expect(pinned).toHaveTextContent('Pinned');
    expect(pinned).toHaveTextContent('Denis');
    expect(screen.getByRole('region', { name: 'Internal notes' })).toHaveTextContent(
        'Visible to staff only. Never sent to the choreographer.'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pin: Prefers morning classes' }));
    await waitFor(() =>
        expect(updateChoreographerNote).toHaveBeenCalledWith('person-1', 'n2', { isPinned: true })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete: Needs a visa letter' }));
    await waitFor(() => expect(removeChoreographerNote).toHaveBeenCalledWith('person-1', 'n1'));

    fireEvent.change(screen.getByLabelText('New note'), { target: { value: ' Vegetarian ' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Add note' }));
    await waitFor(() =>
        expect(addChoreographerNote).toHaveBeenCalledWith('person-1', 'Vegetarian', false)
    );
});

test('follow-ups show what is overdue, can be closed, and a new one is due at the end of the chosen day', async () => {
    jest.mocked(listChoreographerTasks).mockResolvedValue([
        followUp({}),
        followUp({ id: 'task-2', title: 'Old one', status: 'DONE' }),
    ]);
    renderAt('/people/choreographers/person-1/notes', NOTES);

    const list = await screen.findByRole('region', { name: 'Follow-ups' });
    await waitFor(() => expect(list).toHaveTextContent('Send contract'));
    expect(list).toHaveTextContent('Overdue');
    expect(screen.queryByRole('button', { name: 'Mark done: Old one' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mark done: Send contract' }));
    await waitFor(() => expect(updateTaskStatus).toHaveBeenCalledWith('task-1', 'DONE'));

    fireEvent.change(screen.getByLabelText('What needs to be done'), {
        target: { value: 'Request updated photos' },
    });
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2027-03-01' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Add follow-up' }));
    await waitFor(() =>
        expect(addChoreographerTask).toHaveBeenCalledWith('person-1', {
            title: 'Request updated photos',
            dueDate: dueAtEndOfDay('2027-03-01'),
            priority: 'NORMAL',
        })
    );
});

test('notes are read-only without the manage permission and tasks are not requested without tasks.read', async () => {
    jest.mocked(listChoreographerNotes).mockResolvedValue([
        {
            id: 'n1',
            content: 'Needs a visa letter',
            isPinned: false,
            createdAt: '2026-10-01T10:00:00.000Z',
            updatedAt: '2026-10-01T10:00:00.000Z',
            createdByName: null,
        },
    ]);
    renderAt('/people/choreographers/person-1/notes', [...ALL, 'choreographers.notes.read']);

    await screen.findByRole('article', { name: 'Needs a visa letter' });
    expect(screen.queryByRole('form', { name: 'Add note' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Follow-ups' })).not.toBeInTheDocument();
    expect(listChoreographerTasks).not.toHaveBeenCalled();
});

test('only an open task past its due date is overdue', () => {
    const now = new Date('2026-10-09T09:00:00Z');
    expect(isOverdue(followUp({ dueDate: '2026-10-08T09:00:00Z' }), now)).toBe(true);
    expect(isOverdue(followUp({ dueDate: '2026-10-10T09:00:00Z' }), now)).toBe(false);
    expect(isOverdue(followUp({ dueDate: '2026-10-08T09:00:00Z', status: 'DONE' }), now)).toBe(
        false
    );
    expect(isOverdue(followUp({ dueDate: null }), now)).toBe(false);
    expect(dueAtEndOfDay('')).toBeNull();
});
