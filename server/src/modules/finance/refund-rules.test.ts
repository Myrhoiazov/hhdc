import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../../common/http';
import { mapMolliePaymentStatus, mapMollieRefundStatus } from '../../integrations/payment/mollie.mapping';
import { summarizeEventFinance } from './finance-summary';
import { assertRefundRequest, assertTransition, canTransition, paymentStatusAfterRefunds, refundableCents } from './refund-rules';

const code = (expected: string) => (error: unknown) => error instanceof ApiError && error.code === expected;

test('a refund follows request → approval → processing and cannot skip human approval', () => {
    assert.equal(canTransition('REQUESTED', 'APPROVED'), true);
    assert.equal(canTransition('REQUESTED', 'PROCESSING'), false);
    assert.equal(canTransition('COMPLETED', 'PROCESSING'), false);
    assert.equal(canTransition('FAILED', 'PROCESSING'), true);
    assert.throws(() => assertTransition('REJECTED', 'APPROVED'), code('INVALID_REFUND_STATE'));
});

test('open and completed refunds reserve the payment amount; rejected ones do not', () => {
    const refunds = [{ amount: '30.00', status: 'COMPLETED' as const }, { amount: '20.00', status: 'REQUESTED' as const }, { amount: '50.00', status: 'REJECTED' as const }];
    assert.equal(refundableCents('100.00', refunds), 5000);
    assert.throws(() => assertRefundRequest({ paymentStatus: 'PAID', paymentAmount: '100.00', refunds, amount: '50.01' }), code('REFUND_EXCEEDS_PAYMENT'));
    assert.doesNotThrow(() => assertRefundRequest({ paymentStatus: 'PARTIALLY_REFUNDED', paymentAmount: '100.00', refunds, amount: '50.00' }));
});

test('unpaid payments and non-positive amounts cannot be refunded', () => {
    assert.throws(() => assertRefundRequest({ paymentStatus: 'PENDING', paymentAmount: '10.00', refunds: [], amount: '5.00' }), code('PAYMENT_NOT_REFUNDABLE'));
    assert.throws(() => assertRefundRequest({ paymentStatus: 'PAID', paymentAmount: '10.00', refunds: [], amount: '0' }), code('INVALID_AMOUNT'));
});

test('payment status reflects completed refunds without floating point drift', () => {
    assert.equal(paymentStatusAfterRefunds('0.30', [{ amount: '0.10', status: 'COMPLETED' }, { amount: '0.20', status: 'COMPLETED' }]), 'REFUNDED');
    assert.equal(paymentStatusAfterRefunds('100.00', [{ amount: '40.00', status: 'COMPLETED' }, { amount: '60.00', status: 'PROCESSING' }]), 'PARTIALLY_REFUNDED');
    assert.equal(paymentStatusAfterRefunds('100.00', []), 'PAID');
});

test('event finance keeps actual, pending and estimated figures apart', () => {
    const summary = summarizeEventFinance({
        orders: [{ total: '1000.00', status: 'PAID' }, { total: '200.00', status: 'PENDING' }, { total: '99.00', status: 'CANCELLED' }],
        refunds: [{ amount: '100.00', status: 'COMPLETED' }, { amount: '50.00', status: 'REQUESTED' }],
        costs: [{ type: 'FEE', amount: '300.00', status: 'PAID' }, { type: 'HOTEL', amount: '150.00', status: 'PLANNED' }, { type: 'TRAVEL', amount: '80.00', status: 'CANCELLED' }],
    });
    assert.deepEqual(summary.ticketRevenue, { actual: '1000.00', pending: '200.00' });
    assert.deepEqual(summary.refunds, { actual: '100.00', pending: '50.00' });
    assert.deepEqual(summary.netTicketRevenue, { actual: '900.00' });
    assert.deepEqual(summary.costs.FEE, { actual: '300.00', estimated: '0.00' });
    assert.deepEqual(summary.costs.HOTEL, { actual: '0.00', estimated: '150.00' });
    assert.deepEqual(summary.estimatedMargin, { estimated: '450.00' });
});

test('Mollie statuses are normalized and unknown statuses are rejected', () => {
    assert.equal(mapMolliePaymentStatus('paid', '100.00'), 'PAID');
    assert.equal(mapMolliePaymentStatus('paid', '100.00', '40.00'), 'PARTIALLY_REFUNDED');
    assert.equal(mapMolliePaymentStatus('paid', '100.00', '100.00'), 'REFUNDED');
    assert.equal(mapMolliePaymentStatus('expired', '100.00'), 'FAILED');
    assert.equal(mapMollieRefundStatus('queued'), 'PROCESSING');
    assert.equal(mapMollieRefundStatus('refunded'), 'COMPLETED');
    assert.throws(() => mapMolliePaymentStatus('mystery', '1.00'));
});
