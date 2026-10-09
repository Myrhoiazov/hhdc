import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expenseChangeSchema, expenseSchema, paidAtFor, summariseExpenses } from './event-expenses';
import { mayBePaid } from '../people/payees';

const line = (category: string, amount: string, status = 'PLANNED') => ({ category, amount, status });

test('an event without expenses costs nothing', () => {
    assert.deepEqual(summariseExpenses([]), { total: '0.00', paid: '0.00', planned: '0.00', byCategory: [] });
});

test('the cost of an event is what is paid plus what is planned; a cancelled expense counts for nothing', () => {
    const totals = summariseExpenses([line('FEE', '1500.00', 'PAID'), line('FEE', '800.00'), line('VENUE', '4000.00', 'PAID'), line('TRAVEL', '300.00', 'CANCELLED'), line('HOTEL', '0.10'), line('HOTEL', '0.20')]);
    assert.deepEqual([totals.total, totals.paid, totals.planned], ['6300.30', '5500.00', '800.30']);
    assert.deepEqual(totals.byCategory, [{ category: 'VENUE', amount: '4000.00' }, { category: 'FEE', amount: '2300.00' }, { category: 'HOTEL', amount: '0.30' }]);
});

test('an expense approved on a choreographer card is still to be paid', () => {
    assert.deepEqual(summariseExpenses([line('TRAVEL', '200.00', 'APPROVED')]).planned, '200.00');
});

test('an expense needs a known category and a positive amount; a comma is read as a decimal point', () => {
    const parsed = expenseSchema.parse({ category: 'SALARY', amount: '1 250,50'.replace(' ', '') });
    assert.deepEqual([parsed.amount, parsed.currency, parsed.status], ['1250.50', 'EUR', 'PLANNED']);
    assert.equal(expenseSchema.parse({ category: 'VENUE', amount: 4000 }).amount, '4000');
    for (const bad of [{ category: 'BRIBE', amount: '10' }, { category: 'FEE', amount: '0' }, { category: 'FEE', amount: '-5' }, { category: 'FEE', amount: '1.234' }, { category: 'FEE', amount: 'ten' }, { category: 'FEE', amount: '10', eventId: 'x' }]) {
        assert.throws(() => expenseSchema.parse(bad), JSON.stringify(bad));
    }
});

test('a change touches only what it names, so marking an expense paid does not reset the rest', () => {
    assert.deepEqual(expenseChangeSchema.parse({ status: 'PAID' }), { status: 'PAID' });
    assert.deepEqual(expenseChangeSchema.parse({ personId: null }), { personId: null });
    assert.throws(() => expenseChangeSchema.parse({ status: 'DONE' }));
});

test('the moment of payment is set when an expense becomes paid, kept while it stays paid, and cleared when it is not', () => {
    const now = new Date('2026-10-08T12:00:00Z');
    const earlier = new Date('2026-09-01T12:00:00Z');
    assert.equal(paidAtFor('PAID', null, now), now);
    assert.equal(paidAtFor('PAID', earlier, now), earlier);
    assert.equal(paidAtFor('PLANNED', earlier, now), null);
    assert.equal(paidAtFor(undefined, earlier, now), undefined);
});

test('only a choreographer or a staff member can be paid an expense', () => {
    assert.equal(mayBePaid(['CUSTOMER', 'CHOREOGRAPHER']), true);
    assert.equal(mayBePaid(['STAFF']), true);
    assert.equal(mayBePaid(['CUSTOMER', 'PARTICIPANT']), false);
    assert.equal(mayBePaid([]), false);
});
