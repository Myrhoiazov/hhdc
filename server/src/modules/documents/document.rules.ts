// Pure rules for file documents (contracts, invoices, riders…).

export const SENSITIVE_TYPES = ['CONTRACT', 'INVOICE'] as const;

// Contracts and invoices carry legal and financial detail; the other types are operational.
export const isSensitiveType = (type: string): boolean => (SENSITIVE_TYPES as readonly string[]).includes(type);

export const canSeeDocument = (type: string, permissions: string[]): boolean =>
    permissions.includes('documents.read') && (!isSensitiveType(type) || permissions.includes('documents.sensitive.read'));

interface DecimalLike { toString(): string }
export interface InvoicePaymentLike { status: string; amount: DecimalLike; currency: string }
export interface InvoiceLike { amount: DecimalLike | null; currency: string | null; status: string; paidManually: boolean }

export type PaymentEvidence = 'NONE' | 'PARTIAL' | 'PAID' | 'MANUAL';

const toMinor = (value: DecimalLike) => Math.round(Number(value.toString()) * 100);

// Whether an invoice is paid is a fact about payments, not about the invoice label: it is read
// from the confirmed payment records linked to the invoice, in the invoice currency. A PAID label
// set by hand is reported as such, never as proof.
export const invoicePaymentEvidence = (invoice: InvoiceLike, payments: InvoicePaymentLike[]): PaymentEvidence => {
    const confirmed = payments.filter(payment => payment.status === 'CONFIRMED' && payment.currency === invoice.currency);
    const paid = confirmed.reduce((total, payment) => total + toMinor(payment.amount), 0);
    if (paid > 0 && invoice.amount !== null) return paid >= toMinor(invoice.amount) ? 'PAID' : 'PARTIAL';
    if (paid > 0) return 'PARTIAL';
    return invoice.paidManually && ['PAID', 'PARTIALLY_PAID'].includes(invoice.status) ? 'MANUAL' : 'NONE';
};

const PAID_LABELS = ['PAID', 'PARTIALLY_PAID'];
// Choosing a "paid" label by hand is allowed, but it is remembered as a manual statement.
export const isManualPaidLabel = (status: string): boolean => PAID_LABELS.includes(status);
