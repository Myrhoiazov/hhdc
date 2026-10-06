import assert from 'node:assert/strict';
import test from 'node:test';
import { InvoiceStatus } from '@prisma/client';
import { calculateInvoiceStatus, getMolliePaymentNetCents } from './invoices.mollie.service';

const paidPayment = {
    amountValue: '80.00',
    refundedAmount: '0.00',
    chargedBackAmount: '0.00',
    status: 'paid',
    paidAt: new Date('2026-06-13T10:00:00.000Z'),
};

test('Mollie invoice amount uses paid amount minus refunds', () => {
    assert.equal(getMolliePaymentNetCents(paidPayment), 8000);
    assert.equal(getMolliePaymentNetCents({ ...paidPayment, refundedAmount: '15.50' }), 6450);
});

test('Mollie invoice amount removes chargebacks including legacy status-only chargebacks', () => {
    assert.equal(getMolliePaymentNetCents({ ...paidPayment, chargedBackAmount: '80.00' }), 0);
    assert.equal(getMolliePaymentNetCents({ ...paidPayment, status: 'charged_back' }), 0);
});

test('Mollie invoice amount ignores unpaid payments', () => {
    assert.equal(getMolliePaymentNetCents({ ...paidPayment, status: 'open', paidAt: null }), 0);
});

test('paid Mollie payment reopens a canceled invoice as paid', () => {
    assert.equal(calculateInvoiceStatus({
        status: InvoiceStatus.CANCELLED,
        dueDate: null,
        paidAmountCents: 100,
        creditedAmountCents: 0,
        balanceDueCents: 0,
    }), InvoiceStatus.PAID);
});

test('unpaid canceled invoice remains canceled', () => {
    assert.equal(calculateInvoiceStatus({
        status: InvoiceStatus.CANCELLED,
        dueDate: null,
        paidAmountCents: 0,
        creditedAmountCents: 0,
        balanceDueCents: 0,
    }), InvoiceStatus.CANCELLED);
});
