import { PayoutStatus } from './finance';

// What the signed-in user may do with payouts: record them, and confirm that money arrived.
export interface PayoutRights {
    canWrite: boolean;
    canConfirm: boolean;
}

const NEXT: Record<PayoutStatus, PayoutStatus[]> = {
    PLANNED: ['PENDING', 'CONFIRMED', 'CANCELLED'],
    PENDING: ['CONFIRMED', 'FAILED', 'CANCELLED'],
    FAILED: ['PENDING', 'CANCELLED'],
    CONFIRMED: ['CANCELLED'],
    CANCELLED: [],
};

// The statuses a payout can move to. Confirming money, or undoing a confirmation, needs the right
// to confirm; everything else needs the right to record payouts.
export const payoutActions = (status: PayoutStatus, rights: PayoutRights): PayoutStatus[] => {
    if (!rights.canWrite) return [];
    return NEXT[status].filter(
        (target) => rights.canConfirm || (target !== 'CONFIRMED' && status !== 'CONFIRMED')
    );
};
