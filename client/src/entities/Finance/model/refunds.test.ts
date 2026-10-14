import { canRefund, nextRefundActions, paymentIdOf } from './refunds';
import { LedgerEntry } from './types';

const entry = (change: Partial<LedgerEntry> = {}): LedgerEntry => ({
    id: 'PAYMENT:p1',
    kind: 'PAYMENT',
    category: 'TICKETS',
    direction: 'IN',
    date: '2026-10-01',
    amount: '100.00',
    currency: 'EUR',
    status: 'PAID',
    description: null,
    person: null,
    event: null,
    counted: true,
    paidAmount: null,
    ...change,
});

test('a paid payment can be refunded', () => {
    expect(canRefund(entry())).toBe(true);
    expect(canRefund(entry({ status: 'PARTIALLY_REFUNDED', paidAmount: '40.00' }))).toBe(true);
});

test('nothing that is not a paid payment with money left can be refunded', () => {
    expect(canRefund(entry({ kind: 'EXPENSE' }))).toBe(false);
    expect(canRefund(entry({ status: 'REFUNDED' }))).toBe(false);
    expect(canRefund(entry({ status: 'PARTIALLY_REFUNDED', paidAmount: '0.00' }))).toBe(false);
});

test('the id of a payment operation names the payment after its kind', () => {
    expect(paymentIdOf(entry({ id: 'PAYMENT:cm9abc' }))).toBe('cm9abc');
});

test('what can be done with a refund depends on where it stands', () => {
    expect(nextRefundActions('REQUESTED')).toEqual(['approve', 'reject']);
    expect(nextRefundActions('APPROVED')).toEqual(['process', 'reject']);
    expect(nextRefundActions('PROCESSING')).toEqual(['sync']);
    expect(nextRefundActions('FAILED')).toEqual(['process']);
    expect(nextRefundActions('SUCCEEDED')).toEqual([]);
});
