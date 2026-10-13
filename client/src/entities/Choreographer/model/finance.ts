export const FEE_STATUSES = ['PROPOSED', 'COUNTERED', 'AGREED'] as const;

export const EXPENSE_CATEGORIES = [
    'TRAVEL',
    'HOTEL',
    'PER_DIEM',
    'TRANSFER',
    'EQUIPMENT',
    'OTHER',
] as const;

export const EXPENSE_PAYERS = ['ORGANIZER', 'CHOREOGRAPHER', 'OTHER'] as const;

export const PAYOUT_TYPES = ['ADVANCE', 'FEE', 'REIMBURSEMENT', 'OTHER'] as const;

export type PayoutStatus = 'PLANNED' | 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';

// Money arrives as decimal strings, one block per currency: currencies are never added together.
export interface CurrencyTotals {
    currency: string;
    agreedFee: string | null;
    estimatedExpenses: string;
    actualExpenses: string;
    confirmedPayments: string;
    outstandingFee: string | null;
    organizerTotalCost: string;
}

export interface FeeAgreement {
    id: string;
    status: string;
    amount: string;
    currency: string;
    feeBasis: string;
    scopeDescription: string | null;
    notes: string | null;
    createdAt: string;
}

export interface ChoreographerExpense {
    id: string;
    type: string;
    description: string | null;
    currency: string;
    estimatedAmount: string | null;
    actualAmount: string | null;
    paidBy: string;
    reimbursable: boolean;
    status: string;
    expenseDate: string | null;
}

export interface PayoutRecord {
    id: string;
    type: string;
    amount: string;
    currency: string;
    status: PayoutStatus;
    paymentDate: string | null;
    reference: string | null;
}

export interface FinanceAssignment {
    id: string;
    roleTitle: string;
    status: string;
    year: number;
    event: { id: string; name: string; startAt: string };
    agreements: FeeAgreement[];
    expenses: ChoreographerExpense[];
    payments: PayoutRecord[];
    totals: CurrencyTotals[];
}

export interface ChoreographerFinance {
    assignments: FinanceAssignment[];
    years: { year: number; totals: CurrencyTotals[] }[];
}

export interface ExpenseInput {
    category: string;
    currency: string;
    estimatedAmount?: string | null;
    actualAmount?: string | null;
    paidBy: string;
    reimbursable: boolean;
    description?: string;
}
