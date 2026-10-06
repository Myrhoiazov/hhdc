import assert from 'node:assert/strict';
import test from 'node:test';
import { InvoiceDocumentType, InvoiceStatus } from '@prisma/client';
import {
    buildAdjustmentInvoiceData,
    buildOverdueAuditRecords,
    invoiceConfirmSelect,
    invoicePaymentRecordSelect,
    invoiceAdjustmentSourceSelect,
} from './invoices.controller';

const original = {
    id: 42,
    number: 'INV-2026-007',
    documentType: InvoiceDocumentType.INVOICE,
    status: InvoiceStatus.ISSUED,
    clientId: 12,
    billToName: 'Ada Lovelace',
    billToEmail: 'ada@example.com',
    dueDate: new Date('2026-10-01T00:00:00.000Z'),
    currency: 'EUR',
    totalCents: 10000,
    paidAmountCents: 2500,
    creditedAmountCents: 0,
    issuerName: 'Talent Center DDC',
    issuerAddress: 'Studio 1',
    issuerEmail: 'billing@example.com',
    bankName: 'DDC Bank',
    iban: 'NL91ABNA0417164300',
    showPaymentButton: true,
    showPaymentQr: true,
};

const issueDate = new Date('2026-09-05T12:00:00.000Z');

test('buildAdjustmentInvoiceData creates a paid credit note without payment controls', () => {
    const data = buildAdjustmentInvoiceData({
        number: 'CRN-2026-001',
        isCredit: true,
        issueDate,
        original,
        data: { kind: 'CREDIT', amountCents: 3000, reason: 'Correction' },
        actorId: 7,
    });

    assert.equal(data.documentType, InvoiceDocumentType.CREDIT_NOTE);
    assert.equal(data.status, InvoiceStatus.PAID);
    assert.equal(data.parentInvoiceId, original.id);
    assert.equal(data.dueDate, null);
    assert.equal(data.paidAt, issueDate);
    assert.equal(data.balanceDueCents, 0);
    assert.equal(data.showPaymentButton, false);
    assert.equal(data.showPaymentQr, false);
    assert.equal(data.items.create.description, 'Кредит-нота к INV-2026-007: Correction');
});

test('buildAdjustmentInvoiceData creates an issued debit note that keeps payment controls', () => {
    const data = buildAdjustmentInvoiceData({
        number: 'DBN-2026-001',
        isCredit: false,
        issueDate,
        original,
        data: { kind: 'DEBIT', amountCents: 1500, reason: 'Extra class' },
        actorId: undefined,
    });

    assert.equal(data.documentType, InvoiceDocumentType.DEBIT_NOTE);
    assert.equal(data.status, InvoiceStatus.ISSUED);
    assert.equal(data.dueDate, original.dueDate);
    assert.equal(data.paidAt, null);
    assert.equal(data.balanceDueCents, 1500);
    assert.equal(data.showPaymentButton, true);
    assert.equal(data.showPaymentQr, true);
    assert.equal(data.createdById, undefined);
    assert.equal(data.items.create.description, 'Корректировка к INV-2026-007: Extra class');
});

test('invoiceConfirmSelect includes the fields needed for confirmPaidInvoice', () => {
    assert.ok(invoiceConfirmSelect);
    const select = invoiceConfirmSelect as Record<string, unknown>;

    assert.equal(select.id, true);
    assert.equal(select.documentType, true);
    assert.equal(select.status, true);
    assert.equal(select.totalCents, true);
});

test('invoicePaymentRecordSelect matches the PaymentRecordInvoice type', () => {
    assert.ok(invoicePaymentRecordSelect);
    const select = invoicePaymentRecordSelect as Record<string, unknown>;

    assert.equal(select.id, true);
    assert.equal(select.documentType, true);
    assert.equal(select.status, true);
    assert.equal(select.totalCents, true);
    assert.equal(select.paidAmountCents, true);
    assert.equal(select.creditedAmountCents, true);
    assert.equal(select.balanceDueCents, true);
    assert.equal(select.dueDate, true);
});

test('invoiceAdjustmentSourceSelect matches the AdjustmentSourceInvoice type', () => {
    assert.ok(invoiceAdjustmentSourceSelect);
    const select = invoiceAdjustmentSourceSelect as Record<string, unknown>;

    assert.equal(select.id, true);
    assert.equal(select.number, true);
    assert.equal(select.documentType, true);
    assert.equal(select.status, true);
    assert.equal(select.clientId, true);
    assert.equal(select.billToName, true);
    assert.equal(select.billToEmail, true);
    assert.equal(select.dueDate, true);
    assert.equal(select.currency, true);
    assert.equal(select.totalCents, true);
    assert.equal(select.paidAmountCents, true);
    assert.equal(select.creditedAmountCents, true);
    assert.equal(select.issuerName, true);
    assert.equal(select.issuerAddress, true);
    assert.equal(select.issuerEmail, true);
    assert.equal(select.bankName, true);
    assert.equal(select.iban, true);
    assert.equal(select.showPaymentButton, true);
    assert.equal(select.showPaymentQr, true);
});

test('buildOverdueAuditRecords returns no records for an empty invoice list', () => {
    assert.deepEqual(buildOverdueAuditRecords([]), []);
});

test('buildOverdueAuditRecords builds one MARKED_OVERDUE record per invoice', () => {
    const overdueInvoices = [
        { id: 1, status: InvoiceStatus.ISSUED, dueDate: new Date('2026-08-01T00:00:00.000Z'), balanceDueCents: 5000 },
        { id: 2, status: InvoiceStatus.PARTIALLY_PAID, dueDate: new Date('2026-08-05T00:00:00.000Z'), balanceDueCents: 1200 },
    ];

    const records = buildOverdueAuditRecords(overdueInvoices);

    assert.equal(records.length, 2);
    assert.equal(records[0].invoiceId, 1);
    assert.equal(records[0].action, 'MARKED_OVERDUE');
    assert.equal(records[0].actorId, undefined);
    assert.deepEqual(records[0].oldValues, {
        id: 1,
        status: InvoiceStatus.ISSUED,
        dueDate: '2026-08-01T00:00:00.000Z',
        balanceDueCents: 5000,
    });
    assert.deepEqual(records[0].newValues, {
        id: 1,
        status: InvoiceStatus.OVERDUE,
        dueDate: '2026-08-01T00:00:00.000Z',
        balanceDueCents: 5000,
    });
    assert.equal(records[1].invoiceId, 2);
    assert.deepEqual(records[1].oldValues, {
        id: 2,
        status: InvoiceStatus.PARTIALLY_PAID,
        dueDate: '2026-08-05T00:00:00.000Z',
        balanceDueCents: 1200,
    });
});
