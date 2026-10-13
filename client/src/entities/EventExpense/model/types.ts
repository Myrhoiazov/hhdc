export const EVENT_EXPENSE_CATEGORIES = [
    'FEE',
    'SALARY',
    'TRAVEL',
    'HOTEL',
    'VENUE',
    'MARKETING',
    'EQUIPMENT',
    'OTHER',
] as const;

export type EventExpenseCategory = (typeof EVENT_EXPENSE_CATEGORIES)[number];

export type ExpenseStatus = 'PLANNED' | 'PAID' | 'CANCELLED';

// `source` tells where the line is kept: on the event, or on a choreographer's card (shown here, changed there).
export interface ExpenseLine {
    id: string;
    source: 'EVENT' | 'CHOREOGRAPHER_EXPENSE' | 'CHOREOGRAPHER_FEE';
    category: string;
    description: string | null;
    amount: string;
    currency: string;
    status: string;
    date: string | null;
    person: { id: string; displayName: string } | null;
    event?: { id: string; name: string };
    // The role on the event this expense pays for, when it is the pay of a team member.
    teamMember?: { id: string; roleTitle: string } | null;
}

export interface ExpenseList {
    lines: ExpenseLine[];
    totals: {
        total: string;
        paid: string;
        planned: string;
        byCategory: { category: string; amount: string }[];
    };
}

export interface EventExpenseInput {
    category: EventExpenseCategory;
    amount: string;
    description?: string | null;
    expenseDate?: string | null;
    personId?: string | null;
    teamMemberId?: string | null;
    status?: ExpenseStatus;
}
