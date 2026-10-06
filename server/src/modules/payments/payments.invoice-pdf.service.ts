import { InvoiceDocumentType, InvoiceStatus, Prisma } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { createInvoicePdf } from '../invoices/invoices.pdf.service';
import { getMolliePaymentNetCents } from '../invoices/invoices.mollie.service';

export const customerName = (customer: {
    payerName: string | null;
    givenName: string | null;
    familyName: string | null;
    email: string | null;
} | null) => (
    customer?.payerName
    || [customer?.givenName, customer?.familyName].filter(Boolean).join(' ')
    || customer?.email
    || 'Mollie customer'
);

const PAYMENT_QUERY_INCLUDE = {
    invoice: {
        include: {
            items: { orderBy: { id: 'asc' } },
        },
    },
    customer: {
        select: {
            payerName: true,
            givenName: true,
            familyName: true,
            email: true,
        },
    },
} as const;

export type MolliePaymentForPdf = Prisma.PaymentGetPayload<{
    include: typeof PAYMENT_QUERY_INCLUDE;
}>;

export const paymentStatusFor = (
    payment: MolliePaymentForPdf,
    paidAmountCents: number,
    balanceDueCents: number,
): InvoiceStatus => {
    if (paidAmountCents > 0) {
        return balanceDueCents === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
    }
    return payment.status === 'canceled' || payment.status === 'cancelled'
        ? InvoiceStatus.CANCELLED
        : InvoiceStatus.ISSUED;
};

export const buildMollieInvoiceNote = (payment: MolliePaymentForPdf) => [
    `Mollie status: ${payment.status}`,
    `Payment method: ${payment.method || 'unknown'}`,
    Number(payment.refundedAmount) > 0 ? `Refunded: ${payment.refundedAmount} ${payment.amountCurrency}` : null,
    Number(payment.chargedBackAmount) > 0 ? `Charged back: ${payment.chargedBackAmount} ${payment.amountCurrency}` : null,
].filter(Boolean).join('\n');

export const buildMollieInvoiceItem = (
    payment: MolliePaymentForPdf,
    totalCents: number,
): NonNullable<Parameters<typeof createInvoicePdf>[0]['items']>[number] => ({
    id: -payment.id,
    invoiceId: -payment.id,
    groupId: null,
    description: payment.description || `Mollie payment ${payment.mollieId ?? payment.id}`,
    period: payment.paidAt?.toLocaleDateString('nl-NL') ?? null,
    quantity: 1,
    unitPriceCents: totalCents,
    totalCents,
});

export const buildMollieInvoiceDraft = (
    payment: MolliePaymentForPdf,
    totals: { totalCents: number; paidAmountCents: number; balanceDueCents: number },
    status: InvoiceStatus,
): Parameters<typeof createInvoicePdf>[0] => {
    const { totalCents, paidAmountCents, balanceDueCents } = totals;

    return {
        id: -payment.id,
        number: `MOLLIE-${payment.mollieId ?? payment.id}`,
        documentType: InvoiceDocumentType.INVOICE,
        status,
        clientId: null,
        businessBrandId: null,
        parentInvoiceId: null,
        billToName: customerName(payment.customer),
        billToEmail: payment.customer?.email ?? null,
        issueDate: payment.createdAt,
        dueDate: null,
        paidAt: payment.paidAt,
        currency: payment.amountCurrency,
        totalCents,
        issuerName: process.env.INVOICE_ISSUER_NAME ?? 'Talent Center DDC',
        issuerAddress: process.env.INVOICE_ISSUER_ADDRESS ?? '',
        issuerEmail: process.env.INVOICE_ISSUER_EMAIL ?? '',
        issuerPhone: null,
        issuerWebsite: null,
        issuerLegalName: null,
        issuerKvkNumber: null,
        issuerVatNumber: null,
        issuerLogoUrl: null,
        issuerPrimaryColor: null,
        bankName: 'Mollie',
        iban: null,
        paymentReference: payment.mollieId ?? String(payment.id),
        note: buildMollieInvoiceNote(payment),
        showPaymentButton: false,
        showPaymentQr: false,
        paidAmountCents,
        creditedAmountCents: 0,
        balanceDueCents,
        createdById: null,
        updatedById: null,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        items: [buildMollieInvoiceItem(payment, totalCents)],
    };
};

export const createMolliePaymentInvoicePdf = async (paymentId: number) => {
    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: PAYMENT_QUERY_INCLUDE,
    });
    if (!payment) return null;

    if (payment.invoice) {
        return {
            filename: `${payment.invoice.number}.pdf`,
            document: await createInvoicePdf(payment.invoice),
        };
    }

    const totalCents = Math.round(Number(payment.amountValue) * 100);
    const paidAmountCents = getMolliePaymentNetCents(payment);
    const balanceDueCents = Math.max(0, totalCents - paidAmountCents);
    const status = paymentStatusFor(payment, paidAmountCents, balanceDueCents);
    const document = await createInvoicePdf(buildMollieInvoiceDraft(payment, { totalCents, paidAmountCents, balanceDueCents }, status));

    return { filename: `MOLLIE-${payment.mollieId ?? payment.id}.pdf`, document };
};
