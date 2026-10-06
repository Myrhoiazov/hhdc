import assert from 'node:assert/strict';
import test from 'node:test';
import { InvoiceStatus } from '@prisma/client';
import { fromAny, fromPartial } from '@total-typescript/shoehorn';
import {
    MolliePaymentForPdf,
    buildMollieInvoiceDraft,
    buildMollieInvoiceItem,
    buildMollieInvoiceNote,
    customerName,
    paymentStatusFor,
} from './payments.invoice-pdf.service';

const basePayment: MolliePaymentForPdf = fromPartial({
    id: 42,
    mollieId: 'tr_test123',
    amountValue: fromAny('80.00') as MolliePaymentForPdf['amountValue'],
    amountCurrency: 'EUR',
    refundedAmount: fromAny('0.00') as MolliePaymentForPdf['refundedAmount'],
    chargedBackAmount: fromAny('0.00') as MolliePaymentForPdf['chargedBackAmount'],
    adjustmentAt: null,
    description: 'Dance classes',
    method: 'ideal',
    status: 'paid',
    checkoutUrl: null,
    isCancelable: false,
    paidAt: new Date('2026-06-13T10:00:00.000Z'),
    createdAt: new Date('2026-06-10T08:00:00.000Z'),
    updatedAt: new Date('2026-06-13T10:00:00.000Z'),
    customerId: 1,
    subscriptionId: null,
    invoiceId: null,
    customer: {
        payerName: null,
        givenName: 'Ada',
        familyName: 'Lovelace',
        email: 'ada@example.com',
    },
    invoice: null,
});

test('customerName prefers payerName over given/family name and email', () => {
    assert.equal(customerName({
        payerName: 'Preferred Name',
        givenName: 'Ada',
        familyName: 'Lovelace',
        email: 'ada@example.com',
    }), 'Preferred Name');
});

test('customerName falls back to given + family name when payerName is absent', () => {
    assert.equal(customerName({
        payerName: null,
        givenName: 'Ada',
        familyName: 'Lovelace',
        email: 'ada@example.com',
    }), 'Ada Lovelace');
});

test('customerName falls back to email when no name is available', () => {
    assert.equal(customerName({
        payerName: null,
        givenName: null,
        familyName: null,
        email: 'ada@example.com',
    }), 'ada@example.com');
});

test('customerName falls back to a generic label when nothing is available', () => {
    assert.equal(customerName(null), 'Mollie customer');
    assert.equal(customerName({ payerName: null, givenName: null, familyName: null, email: null }), 'Mollie customer');
});

test('paymentStatusFor returns PAID when fully paid', () => {
    assert.equal(paymentStatusFor(basePayment, 8000, 0), InvoiceStatus.PAID);
});

test('paymentStatusFor returns PARTIALLY_PAID when partially paid', () => {
    assert.equal(paymentStatusFor(basePayment, 4000, 4000), InvoiceStatus.PARTIALLY_PAID);
});

test('paymentStatusFor returns CANCELLED when unpaid and the Mollie payment was canceled', () => {
    assert.equal(paymentStatusFor({ ...basePayment, status: 'canceled' }, 0, 8000), InvoiceStatus.CANCELLED);
    assert.equal(paymentStatusFor({ ...basePayment, status: 'cancelled' }, 0, 8000), InvoiceStatus.CANCELLED);
});

test('paymentStatusFor returns ISSUED when unpaid and not canceled', () => {
    assert.equal(paymentStatusFor({ ...basePayment, status: 'open' }, 0, 8000), InvoiceStatus.ISSUED);
});

test('buildMollieInvoiceNote includes status and method, omits refund/chargeback lines when zero', () => {
    const note = buildMollieInvoiceNote(basePayment);
    assert.match(note, /Mollie status: paid/);
    assert.match(note, /Payment method: ideal/);
    assert.doesNotMatch(note, /Refunded/);
    assert.doesNotMatch(note, /Charged back/);
});

test('buildMollieInvoiceNote includes refund and chargeback lines when present', () => {
    const note = buildMollieInvoiceNote({
        ...basePayment,
        refundedAmount: fromAny('10.00') as MolliePaymentForPdf['refundedAmount'],
        chargedBackAmount: fromAny('5.00') as MolliePaymentForPdf['chargedBackAmount'],
    });
    assert.match(note, /Refunded: 10\.00 EUR/);
    assert.match(note, /Charged back: 5\.00 EUR/);
});

test('buildMollieInvoiceNote falls back to "unknown" when the payment method is missing', () => {
    const note = buildMollieInvoiceNote({ ...basePayment, method: '' });
    assert.match(note, /Payment method: unknown/);
});

test('buildMollieInvoiceItem uses the payment description when present', () => {
    const item = buildMollieInvoiceItem(basePayment, 8000);
    assert.equal(item.description, 'Dance classes');
    assert.equal(item.totalCents, 8000);
    assert.equal(item.unitPriceCents, 8000);
    assert.equal(item.id, -42);
});

test('buildMollieInvoiceItem falls back to a generated description when the payment has none', () => {
    const item = buildMollieInvoiceItem({ ...basePayment, description: null }, 8000);
    assert.equal(item.description, 'Mollie payment tr_test123');
});

test('buildMollieInvoiceDraft derives billToName and status from the payment', () => {
    const draft = buildMollieInvoiceDraft(
        basePayment,
        { totalCents: 8000, paidAmountCents: 8000, balanceDueCents: 0 },
        InvoiceStatus.PAID,
    );

    assert.equal(draft.billToName, 'Ada Lovelace');
    assert.equal(draft.billToEmail, 'ada@example.com');
    assert.equal(draft.status, InvoiceStatus.PAID);
    assert.equal(draft.number, 'MOLLIE-tr_test123');
    assert.equal(draft.paymentReference, 'tr_test123');
    assert.equal(draft.bankName, 'Mollie');
    assert.equal(draft.items.length, 1);
});
