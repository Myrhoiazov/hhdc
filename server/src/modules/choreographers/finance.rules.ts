// Finance rules for one choreographer assignment (specification section 12). Pure: amounts come
// in as decimal strings or Decimal-like values and are summed in minor units, never as floats.
// Nothing here ever adds two currencies together.

interface DecimalLike { toString(): string }

export interface AgreementLike { status: string; amount: DecimalLike; currency: string }
export interface ExpenseLike { status: string; actualAmount: DecimalLike | null; estimatedAmount: DecimalLike | null; currency: string; paidBy: string; reimbursable: boolean }
export interface PaymentLike { status: string; type: string; amount: DecimalLike; currency: string }

export interface CurrencyTotals {
    currency: string;
    // The single current AGREED fee — never the sum of offers.
    agreedFee: string | null;
    estimatedExpenses: string;
    actualExpenses: string;
    // Confirmed payments only; planned and pending ones are not money that moved.
    confirmedPayments: string;
    // Agreed fee minus confirmed fee and advance payments. Reimbursements do not reduce it.
    outstandingFee: string | null;
    // Agreed fee plus what the organizer actually bears: its own expenses and the ones it reimburses.
    organizerTotalCost: string;
}

const toMinor = (value: DecimalLike | null): number => (value === null ? 0 : Math.round(Number(value.toString()) * 100));
const toAmount = (minor: number): string => (minor / 100).toFixed(2);
const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

const FEE_PAYMENT_TYPES = ['FEE', 'ADVANCE'];
const isLive = (item: { status: string }) => item.status.toUpperCase() !== 'CANCELLED';
const organizerBears = (expense: ExpenseLike) => expense.paidBy === 'ORGANIZER' || expense.reimbursable;

interface AssignmentLedger { agreements: AgreementLike[]; expenses: ExpenseLike[]; payments: PaymentLike[] }

const totalsFor = (currency: string, ledger: AssignmentLedger): CurrencyTotals => {
    const agreed = ledger.agreements.find(item => item.status === 'AGREED' && item.currency === currency);
    const expenses = ledger.expenses.filter(item => item.currency === currency && isLive(item));
    const confirmed = ledger.payments.filter(item => item.currency === currency && item.status === 'CONFIRMED');
    const agreedFee = agreed ? toMinor(agreed.amount) : null;
    const feePaid = sum(confirmed.filter(item => FEE_PAYMENT_TYPES.includes(item.type)).map(item => toMinor(item.amount)));
    return {
        currency,
        agreedFee: agreedFee === null ? null : toAmount(agreedFee),
        estimatedExpenses: toAmount(sum(expenses.map(item => toMinor(item.estimatedAmount)))),
        actualExpenses: toAmount(sum(expenses.map(item => toMinor(item.actualAmount)))),
        confirmedPayments: toAmount(sum(confirmed.map(item => toMinor(item.amount)))),
        outstandingFee: agreedFee === null ? null : toAmount(agreedFee - feePaid),
        organizerTotalCost: toAmount((agreedFee ?? 0) + sum(expenses.filter(organizerBears).map(item => toMinor(item.actualAmount)))),
    };
};

// One block of totals per currency that appears anywhere on the assignment.
export const assignmentTotals = (ledger: AssignmentLedger): CurrencyTotals[] => {
    const currencies = new Set([...ledger.agreements, ...ledger.expenses, ...ledger.payments].map(item => item.currency));
    return Array.from(currencies).sort().map(currency => totalsFor(currency, ledger));
};

const NUMERIC_FIELDS = ['estimatedExpenses', 'actualExpenses', 'confirmedPayments', 'organizerTotalCost'] as const;
const NULLABLE_FIELDS = ['agreedFee', 'outstandingFee'] as const;

const addNullable = (left: string | null, right: string | null): string | null =>
    (left === null && right === null ? null : toAmount(toMinor(left) + toMinor(right)));

const mergeTotals = (left: CurrencyTotals, right: CurrencyTotals): CurrencyTotals => ({
    currency: left.currency,
    ...Object.fromEntries(NUMERIC_FIELDS.map(field => [field, toAmount(toMinor(left[field]) + toMinor(right[field]))])),
    ...Object.fromEntries(NULLABLE_FIELDS.map(field => [field, addNullable(left[field], right[field])])),
} as CurrencyTotals);

// Yearly grouping: totals of several assignments are added per currency, still never across them.
export const combineTotals = (groups: CurrencyTotals[][]): CurrencyTotals[] => {
    const byCurrency = new Map<string, CurrencyTotals>();
    groups.flat().forEach(totals => {
        const existing = byCurrency.get(totals.currency);
        byCurrency.set(totals.currency, existing ? mergeTotals(existing, totals) : totals);
    });
    return Array.from(byCurrency.values()).sort((a, b) => a.currency.localeCompare(b.currency));
};

// A payment's amount is fixed once recorded; only its status moves, and only forward.
const PAYMENT_TRANSITIONS: Record<string, string[]> = {
    PLANNED: ['PENDING', 'CONFIRMED', 'CANCELLED'],
    PENDING: ['CONFIRMED', 'FAILED', 'CANCELLED'],
    FAILED: ['PENDING', 'CANCELLED'],
    CONFIRMED: ['CANCELLED'],
    CANCELLED: [],
};
export const canMovePayment = (from: string, to: string): boolean => (PAYMENT_TRANSITIONS[from] ?? []).includes(to);

// What the event finance overview reads for an expense: the actual figure once known.
export const effectiveExpenseAmount = (expense: { actualAmount: DecimalLike | null; estimatedAmount: DecimalLike | null }): string =>
    toAmount(toMinor(expense.actualAmount ?? expense.estimatedAmount));
