import type { BadgeTone } from '@/shared/ui/Badge';

const SETTLED = ['PAID'];
const UNDONE = ['CANCELLED', 'REFUNDED'];

// How the status of an order is coloured: paid is settled, cancelled and refunded are undone.
export const orderTone = (status: string): BadgeTone | undefined => {
    if (SETTLED.includes(status)) return 'success';
    return UNDONE.includes(status) ? 'danger' : undefined;
};
