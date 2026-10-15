import { ExpenseStatus } from './types';

// What can be done with an expense of an event, with the label of the button that does it.
const NEXT_STATUS: Record<string, Array<[ExpenseStatus, string]>> = {
    PLANNED: [
        ['PAID', 'Mark paid'],
        ['CANCELLED', 'Cancel expense'],
    ],
    PAID: [['CANCELLED', 'Cancel expense']],
    CANCELLED: [['PLANNED', 'Restore']],
};

export const nextExpenseActions = (status: string): Array<[ExpenseStatus, string]> =>
    NEXT_STATUS[status] ?? [];
