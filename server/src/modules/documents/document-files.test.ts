import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { ApiError } from '../../common/http';
import { assertDocumentFile, detectDocumentFile, safeFilename } from '../../common/storage/document-file';
import { canSeeDocument, invoicePaymentEvidence, isManualPaidLabel } from './document.rules';
import { createDocumentSchema, updateDocumentSchema } from './document-files.service';

const docx = Buffer.concat([Buffer.from('PK\u0003\u0004', 'latin1'), Buffer.from('....[Content_Types].xml....word/document.xml....')]);

test('the file type is read from the bytes: PDF, DOCX and images pass, anything else is refused', async () => {
    assert.equal(detectDocumentFile(Buffer.from('%PDF-1.7\n...'))?.extension, 'pdf');
    assert.equal(detectDocumentFile(docx)?.extension, 'docx');
    assert.equal(detectDocumentFile(await sharp({ create: { width: 4, height: 4, channels: 3, background: '#fff' } }).png().toBuffer())?.extension, 'png');
    // A plain ZIP, an executable renamed to .pdf and a script are not documents.
    assert.equal(detectDocumentFile(Buffer.concat([Buffer.from('PK\u0003\u0004', 'latin1'), Buffer.from('payload.exe')])), null);
    assert.equal(detectDocumentFile(Buffer.from('MZ\u0090\u0000 contract.pdf')), null);
    assert.equal(detectDocumentFile(Buffer.from('<html><script>alert(1)</script>')), null);
    const rejected = (error: unknown) => error instanceof ApiError && error.code === 'DOCUMENT_REJECTED';
    assert.throws(() => assertDocumentFile(Buffer.from('MZ not a document')), rejected);
    assert.throws(() => assertDocumentFile(Buffer.alloc(20 * 1024 * 1024 + 1, 0x25)), rejected);
    assert.equal(detectDocumentFile(Buffer.from('%PDF-1.7'))?.inline, true);
    assert.equal(detectDocumentFile(docx)?.inline, false);
});

test('a file name loses its path and anything unsafe in a header', () => {
    assert.equal(safeFilename('../../etc/passwd'), 'passwd');
    assert.equal(safeFilename('C:\\Users\\x\\Contract "final".pdf'), 'Contract final.pdf');
    assert.equal(safeFilename('Договор 2027.pdf'), 'Договор 2027.pdf');
    assert.equal(safeFilename('\r\n'), 'document');
});

test('contracts and invoices need the sensitive permission; riders do not', () => {
    assert.equal(canSeeDocument('RIDER', ['documents.read']), true);
    assert.equal(canSeeDocument('CONTRACT', ['documents.read']), false);
    assert.equal(canSeeDocument('INVOICE', ['documents.read', 'documents.sensitive.read']), true);
    assert.equal(canSeeDocument('RIDER', ['documents.sensitive.read']), false);
});

test('an uploaded invoice is not paid: only confirmed payments linked to it make it so', () => {
    const invoice = { amount: '2500', currency: 'EUR', status: 'RECEIVED', paidManually: false };
    const pay = (status: string, amount: string, currency = 'EUR') => ({ status, amount, currency });
    assert.equal(invoicePaymentEvidence(invoice, []), 'NONE');
    assert.equal(invoicePaymentEvidence(invoice, [pay('PENDING', '2500')]), 'NONE');
    assert.equal(invoicePaymentEvidence(invoice, [pay('CONFIRMED', '500')]), 'PARTIAL');
    assert.equal(invoicePaymentEvidence(invoice, [pay('CONFIRMED', '500'), pay('CONFIRMED', '2000')]), 'PAID');
    assert.equal(invoicePaymentEvidence(invoice, [pay('CONFIRMED', '2500', 'USD')]), 'NONE');
});

test('a paid label set by hand is reported as manual, never as proof of payment', () => {
    assert.equal(isManualPaidLabel('PAID'), true);
    assert.equal(isManualPaidLabel('APPROVED'), false);
    assert.equal(invoicePaymentEvidence({ amount: '2500', currency: 'EUR', status: 'PAID', paidManually: true }, []), 'MANUAL');
    assert.equal(invoicePaymentEvidence({ amount: '2500', currency: 'EUR', status: 'APPROVED', paidManually: false }, []), 'NONE');
});

test('document input: a typed document with optional invoice and contract details', () => {
    const parsed = createDocumentSchema.parse({ type: 'INVOICE', title: ' Invoice 2026-014 ', amount: '2500,00', currency: 'eur', invoiceNumber: '2026-014', issuerName: 'Jojo LLC', assignmentId: '' });
    assert.deepEqual([parsed.title, parsed.amount, parsed.currency, parsed.assignmentId], ['Invoice 2026-014', '2500.00', 'EUR', null]);
    assert.throws(() => createDocumentSchema.parse({ type: 'PASSPORT', title: 'x' }));
    assert.throws(() => createDocumentSchema.parse({ type: 'CONTRACT', title: '' }));
    assert.equal(updateDocumentSchema.parse({ contractStatus: 'SIGNED' }).contractStatus, 'SIGNED');
    assert.throws(() => updateDocumentSchema.parse({ contractStatus: 'PAID' }));
    assert.throws(() => updateDocumentSchema.parse({ type: 'OTHER' }));
});
