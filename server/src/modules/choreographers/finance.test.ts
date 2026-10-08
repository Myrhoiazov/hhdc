import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignmentTotals, canMovePayment, combineTotals, effectiveExpenseAmount } from './finance.rules';
import { expenseSchema, feeAgreementSchema, paymentSchema } from './finance.service';

const agreement = (status: string, amount: string, currency = 'EUR') => ({ status, amount, currency });
const expense = (actual: string | null, estimated: string | null, extra: Partial<{ paidBy: string; reimbursable: boolean; status: string; currency: string }> = {}) =>
    ({ status: 'PAID', actualAmount: actual, estimatedAmount: estimated, currency: 'EUR', paidBy: 'ORGANIZER', reimbursable: false, ...extra });
const payment = (type: string, status: string, amount: string, currency = 'EUR') => ({ type, status, amount, currency });

test('2026 example from the specification: offers are not summed, advance and final payment settle the agreed fee', () => {
    const [totals] = assignmentTotals({
        agreements: [agreement('PROPOSED', '2000'), agreement('COUNTERED', '2700'), agreement('AGREED', '2500')],
        expenses: [expense('280.00', null), expense('400', '300')],
        payments: [payment('ADVANCE', 'CONFIRMED', '500'), payment('FEE', 'CONFIRMED', '2000')],
    });
    assert.deepEqual(totals, {
        currency: 'EUR', agreedFee: '2500.00', estimatedExpenses: '300.00', actualExpenses: '680.00',
        confirmedPayments: '2500.00', outstandingFee: '0.00', organizerTotalCost: '3180.00',
    });
});

test('only confirmed payments count, and a reimbursement does not reduce the outstanding fee', () => {
    const [totals] = assignmentTotals({
        agreements: [agreement('AGREED', '1500')],
        expenses: [],
        payments: [payment('FEE', 'PENDING', '1500'), payment('ADVANCE', 'CONFIRMED', '500'), payment('REIMBURSEMENT', 'CONFIRMED', '120'), payment('FEE', 'CANCELLED', '900')],
    });
    assert.equal(totals.confirmedPayments, '620.00');
    assert.equal(totals.outstandingFee, '1000.00');
});

test('the organizer bears its own expenses and the ones it reimburses, not what the choreographer pays alone', () => {
    const [totals] = assignmentTotals({
        agreements: [agreement('AGREED', '1000')],
        expenses: [
            expense('350', null), expense('100', null, { paidBy: 'CHOREOGRAPHER', reimbursable: true }),
            expense('60', null, { paidBy: 'CHOREOGRAPHER' }), expense('999', null, { status: 'CANCELLED' }),
        ],
        payments: [],
    });
    assert.equal(totals.actualExpenses, '510.00');
    assert.equal(totals.organizerTotalCost, '1450.00');
});

test('currencies are never added together', () => {
    const totals = assignmentTotals({
        agreements: [agreement('AGREED', '1500', 'EUR')],
        expenses: [expense('200', null, { currency: 'USD' })],
        payments: [payment('FEE', 'CONFIRMED', '1500', 'EUR')],
    });
    assert.deepEqual(totals.map(item => [item.currency, item.agreedFee, item.actualExpenses, item.organizerTotalCost]), [
        ['EUR', '1500.00', '0.00', '1500.00'], ['USD', null, '200.00', '200.00'],
    ]);
});

test('without an agreed fee nothing is outstanding and offers alone create no cost', () => {
    const [totals] = assignmentTotals({ agreements: [agreement('PROPOSED', '2000'), agreement('SUPERSEDED', '1800')], expenses: [], payments: [] });
    assert.deepEqual([totals.agreedFee, totals.outstandingFee, totals.organizerTotalCost], [null, null, '0.00']);
});

test('yearly totals add assignments per currency', () => {
    const first = assignmentTotals({ agreements: [agreement('AGREED', '1500')], expenses: [expense('350', null)], payments: [payment('FEE', 'CONFIRMED', '1500')] });
    const second = assignmentTotals({ agreements: [agreement('AGREED', '800'), agreement('AGREED', '300', 'USD')], expenses: [], payments: [] });
    const combined = combineTotals([first, second]);
    assert.deepEqual(combined.map(item => [item.currency, item.agreedFee, item.outstandingFee, item.organizerTotalCost]), [
        ['EUR', '2300.00', '800.00', '2650.00'], ['USD', '300.00', '300.00', '300.00'],
    ]);
});

test('sums stay exact where floating point would drift', () => {
    const [totals] = assignmentTotals({ agreements: [], expenses: [expense('0.10', null), expense('0.20', null), expense('1100.10', null)], payments: [] });
    assert.equal(totals.actualExpenses, '1100.40');
    assert.equal(effectiveExpenseAmount({ actualAmount: null, estimatedAmount: '300' }), '300.00');
    assert.equal(effectiveExpenseAmount({ actualAmount: '350.5', estimatedAmount: '300' }), '350.50');
});

test('a payment moves forward only: a cancelled one stays cancelled', () => {
    assert.equal(canMovePayment('PLANNED', 'CONFIRMED'), true);
    assert.equal(canMovePayment('PENDING', 'FAILED'), true);
    assert.equal(canMovePayment('CONFIRMED', 'CANCELLED'), true);
    assert.equal(canMovePayment('CONFIRMED', 'PENDING'), false);
    assert.equal(canMovePayment('CANCELLED', 'CONFIRMED'), false);
});

test('amounts are decimals with a currency; a payment cannot be born confirmed', () => {
    assert.deepEqual(feeAgreementSchema.parse({ status: 'AGREED', amount: '2500,50', currency: 'eur' }), { status: 'AGREED', amount: '2500.50', currency: 'EUR', feeBasis: 'EVENT' });
    assert.throws(() => feeAgreementSchema.parse({ status: 'AGREED', amount: '25.123', currency: 'EUR' }));
    assert.throws(() => feeAgreementSchema.parse({ status: 'SUPERSEDED', amount: '25', currency: 'EUR' }));
    assert.throws(() => feeAgreementSchema.parse({ status: 'AGREED', amount: '-5', currency: 'EUR' }));
    assert.throws(() => expenseSchema.parse({ category: 'TRAVEL', currency: 'EUR' }));
    assert.equal(expenseSchema.parse({ category: 'HOTEL', currency: 'EUR', actualAmount: 280 }).actualAmount, '280');
    assert.throws(() => paymentSchema.parse({ type: 'FEE', amount: '100', currency: 'EUR', status: 'CONFIRMED' }));
    assert.throws(() => paymentSchema.parse({ type: 'FEE', amount: '0', currency: 'EUR' }));
});
