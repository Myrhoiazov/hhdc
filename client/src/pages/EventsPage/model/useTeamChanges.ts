import { useCallback, useState } from 'react';
import {
    removeTeamMember,
    TeamMember,
    TeamMemberChange,
    updateTeamMember,
} from '@/entities/EventTeam';
import { createEventExpense } from '@/entities/EventExpense';
import { useAction } from '@/shared/lib/useResource/useAction';
import { Open, TeamPayment } from './teamTypes';

// Changes of the team of one event: each is saved at once and the team is read again.
export const useTeamChanges = (eventId: string, refresh: () => void) => {
    const [open, setOpen] = useState<Open>(null);
    const done = useCallback(() => {
        setOpen(null);
        refresh();
    }, [refresh]);
    const action = useAction(done);
    return {
        open,
        setOpen,
        busy: action.busy,
        error: action.error,
        save: (member: TeamMember, change: TeamMemberChange) =>
            void action.run(() => updateTeamMember(eventId, member.id, change)),
        pay: (member: TeamMember, payment: TeamPayment) =>
            void action.run(() =>
                createEventExpense(eventId, {
                    category: 'SALARY',
                    amount: payment.amount,
                    expenseDate: payment.expenseDate,
                    teamMemberId: member.id,
                    status: payment.paid ? 'PAID' : 'PLANNED',
                })
            ),
        remove: async (member: TeamMember) => {
            await removeTeamMember(eventId, member.id);
            done();
        },
    };
};
