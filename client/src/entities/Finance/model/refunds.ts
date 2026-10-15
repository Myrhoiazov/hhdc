import { LedgerEntry } from './types';

// Payments in these states still hold money that can be given back.
const REFUNDABLE = ['PAID', 'PARTIALLY_REFUNDED'];

export type RefundAction = 'approve' | 'reject' | 'process' | 'sync';

// What staff may do with a refund at each stage; the server enforces the same steps.
const REFUND_ACTIONS: Record<string, RefundAction[]> = {
    REQUESTED: ['approve', 'reject'],
    APPROVED: ['process', 'reject'],
    PROCESSING: ['sync'],
    FAILED: ['process'],
};

export const canRefund = (entry: LedgerEntry) =>
    entry.kind === 'PAYMENT' &&
    REFUNDABLE.includes(entry.status) &&
    Number(entry.paidAmount ?? entry.amount) > 0;

// The id of an operation names its kind first: "PAYMENT:<id of the payment>".
export const paymentIdOf = (entry: LedgerEntry): string => entry.id.slice('PAYMENT:'.length);

export const nextRefundActions = (status: string): RefundAction[] => REFUND_ACTIONS[status] ?? [];
