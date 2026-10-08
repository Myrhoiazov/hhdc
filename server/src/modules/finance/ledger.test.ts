import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expenseCategory, isCounted, ledgerFiltersSchema, matchesLedger, newestFirst, paymentState, summariseLedger, toEntry, type LedgerEntry } from './ledger';

const amount = (value: string) => ({ toFixed: () => value });
const anna = { id: 'p1', displayName: 'Anna Berg' };
const camp = { id: 'e1', name: 'Dance Camp' };

const payment = (id: string, value: string, date: string, status = 'PAID'): LedgerEntry =>
    toEntry({ id, kind: 'PAYMENT', category: 'TICKETS', status, amount: amount(value), currency: 'EUR', date: new Date(date), person: anna, event: camp, description: 'ideal' });
const refund = (id: string, value: string, status: string): LedgerEntry =>
    toEntry({ id, kind: 'REFUND', category: 'REFUNDS', status, amount: amount(value), currency: 'EUR', date: new Date('2026-03-02T10:00:00Z'), description: 'Cannot come' });
const expense = (id: string, category: string, value: string, status = 'PLANNED'): LedgerEntry =>
    toEntry({ id, kind: 'EXPENSE', category, status, amount: amount(value), currency: 'EUR', date: new Date('2026-04-01T00:00:00Z'), event: camp, description: 'Studio rent' });

test('a payment is money in, a refund and an expense are money out', () => {
    assert.deepEqual([payment('1', '10.00', '2026-01-01').direction, refund('2', '5.00', 'COMPLETED').direction, expense('3', 'VENUE', '5.00').direction], ['IN', 'OUT', 'OUT']);
    assert.equal(payment('1', '10.00', '2026-01-01').id, 'PAYMENT:1');
    assert.deepEqual(payment('1', '10.00', '2026-01-01').person, { id: 'p1', name: 'Anna Berg' });
});

test('totals count only money that moved or is planned to: not failed, requested or cancelled', () => {
    const summary = summariseLedger([
        payment('1', '100.00', '2026-01-01'), payment('2', '50.00', '2026-01-02', 'FAILED'),
        refund('3', '20.00', 'COMPLETED'), refund('4', '30.00', 'REQUESTED'),
        expense('5', 'VENUE', '40.00', 'PAID'), expense('6', 'FEE', '10.00'), expense('7', 'FEE', '99.00', 'CANCELLED'),
    ]);
    assert.deepEqual([summary.income, summary.refunds, summary.expenses, summary.result, summary.operations], ['100.00', '20.00', '50.00', '30.00', 7]);
});

test('categories are added up from the largest and say which way the money went', () => {
    const { byCategory } = summariseLedger([payment('1', '100.00', '2026-01-01'), expense('2', 'FEE', '10.00'), expense('3', 'FEE', '15.00'), expense('4', 'VENUE', '40.00')]);
    assert.deepEqual(byCategory, [
        { category: 'TICKETS', direction: 'IN', operations: 1, amount: '100.00' },
        { category: 'VENUE', direction: 'OUT', operations: 1, amount: '40.00' },
        { category: 'FEE', direction: 'OUT', operations: 2, amount: '25.00' },
    ]);
});

test('an empty list adds up to zero', () => {
    assert.deepEqual(summariseLedger([]), { currency: 'EUR', income: '0.00', refunds: '0.00', expenses: '0.00', result: '0.00', operations: 0, byCategory: [] });
});

test('filters narrow by category, event, period and text; the last day of the period is included', () => {
    const entry = payment('1', '10.00', '2026-03-10T22:00:00Z');
    assert.equal(matchesLedger(entry, {}), true);
    assert.equal(matchesLedger(entry, { category: 'TICKETS', eventId: 'e1', from: '2026-03-10', to: '2026-03-10', q: 'anna' }), true);
    assert.equal(matchesLedger(entry, { category: 'FEE' }), false);
    assert.equal(matchesLedger(entry, { eventId: 'e2' }), false);
    assert.equal(matchesLedger(entry, { from: '2026-03-11' }), false);
    assert.equal(matchesLedger(entry, { to: '2026-03-09' }), false);
    assert.equal(matchesLedger(entry, { q: 'camp' }), true);
    assert.equal(matchesLedger(entry, { q: 'nobody' }), false);
});

test('the newest operation comes first', () => {
    const sorted = newestFirst([payment('a', '1.00', '2026-01-01'), payment('b', '1.00', '2026-05-01'), payment('c', '1.00', '2026-03-01')]);
    assert.deepEqual(sorted.map(entry => entry.id), ['PAYMENT:b', 'PAYMENT:c', 'PAYMENT:a']);
});

test('an unknown expense category is shown as other', () => {
    assert.equal(expenseCategory('PER_DIEM'), 'OTHER');
    assert.equal(expenseCategory('HOTEL'), 'HOTEL');
});

test('an empty filter in the address means no filter and an unknown category is refused', () => {
    assert.deepEqual(Object.values(ledgerFiltersSchema.parse({ q: '', category: '', eventId: '', from: '', to: '', page: '2' })).filter(Boolean), []);
    assert.throws(() => ledgerFiltersSchema.parse({ category: 'BRIBES' }));
    assert.throws(() => ledgerFiltersSchema.parse({ from: '10.03.2026' }));
});

test('a payment of a refunded or cancelled order takes the state of the order and is not income', () => {
    assert.equal(paymentState('PAID', 'REFUNDED'), 'REFUNDED');
    assert.equal(paymentState('PAID', 'CANCELLED'), 'CANCELLED');
    assert.equal(paymentState('PAID', 'PAID'), 'PAID');
    assert.equal(paymentState('FAILED', undefined), 'FAILED');
    assert.deepEqual([isCounted('PAYMENT', 'REFUNDED'), isCounted('PAYMENT', 'CANCELLED'), isCounted('PAYMENT', 'PAID')], [false, false, true]);
    assert.equal(summariseLedger([payment('1', '100.00', '2026-01-01'), payment('2', '397.82', '2026-01-02', 'REFUNDED')]).income, '100.00');
});
