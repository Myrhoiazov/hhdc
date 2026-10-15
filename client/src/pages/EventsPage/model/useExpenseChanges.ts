import { useCallback, useState } from 'react';
import {
    deleteEventExpense,
    ExpenseLine,
    ExpenseStatus,
    updateEventExpense,
} from '@/entities/EventExpense';
import { listEventTeam, TeamMember } from '@/entities/EventTeam';
import { useAction } from '@/shared/lib/useResource/useAction';
import { useResource } from '@/shared/lib/useResource/useResource';
import { ExpenseEdit } from './expenseForm';

// Changes of the expenses of one event: each is saved at once and the list is read again.
export const useExpenseChanges = (eventId: string, refresh: () => void) => {
    const [editingId, setEditingId] = useState('');
    const done = useCallback(() => {
        setEditingId('');
        refresh();
    }, [refresh]);
    const action = useAction(done);
    return {
        editingId,
        busy: action.busy,
        error: action.error,
        edit: (line: ExpenseLine) => setEditingId(line.id),
        cancel: () => setEditingId(''),
        setStatus: (line: ExpenseLine, status: ExpenseStatus) =>
            void action.run(() => updateEventExpense(eventId, line.id, { status })),
        save: (line: ExpenseLine, change: ExpenseEdit) =>
            void action.run(() => updateEventExpense(eventId, line.id, change)),
        remove: async (line: ExpenseLine) => {
            await deleteEventExpense(eventId, line.id);
            done();
        },
    };
};

// Everything the event costs in one place: what was entered here and what is kept on the cards
// of its choreographers. Every change is saved at once and reaches the finance pages by itself.
// The team of the event, for choosing whom an expense is paid to; nobody who cannot change expenses needs it.
const NO_TEAM: TeamMember[] = [];

export const usePayeeTeam = (eventId: string, canEdit: boolean, version: number) => {
    const load = useCallback(
        () => (canEdit ? listEventTeam(eventId) : Promise.resolve(NO_TEAM)),
        // `version` asks for the team again after it changed.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [eventId, canEdit, version]
    );
    return useResource(load).data ?? NO_TEAM;
};
