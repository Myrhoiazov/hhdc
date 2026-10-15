export interface Refund {
    id: string;
    amount: string;
    currency: string;
    status: string;
    reason: string;
    error?: string | null;
    person?: { displayName: string } | null;
}

// Every movement of money as one list: payments of buyers, refunds and costs of events.
export const LEDGER_CATEGORIES = [
    'TICKETS',
    'REFUNDS',
    'FEE',
    'SALARY',
    'TRAVEL',
    'HOTEL',
    'VENUE',
    'MARKETING',
    'EQUIPMENT',
    'OTHER',
] as const;

export type LedgerCategory = (typeof LEDGER_CATEGORIES)[number];

export interface LedgerEntry {
    id: string;
    kind: 'PAYMENT' | 'REFUND' | 'EXPENSE';
    category: string;
    direction: 'IN' | 'OUT';
    date: string;
    amount: string;
    currency: string;
    status: string;
    description: string | null;
    person: { id: string; name: string } | null;
    event: { id: string; name: string } | null;
    counted: boolean;
    paidAmount: string | null;
}

export interface LedgerCategoryTotal {
    category: string;
    direction: 'IN' | 'OUT';
    operations: number;
    amount: string;
}

export interface LedgerSummary {
    currency: string;
    income: string;
    refunds: string;
    expenses: string;
    planned: string;
    result: string;
    operations: number;
    byCategory: LedgerCategoryTotal[];
}

export interface LedgerFilters {
    q: string;
    category: LedgerCategory | '';
    eventId: string;
    from: string;
    to: string;
}

export const LEDGER_PAGE_SIZE = 25;
