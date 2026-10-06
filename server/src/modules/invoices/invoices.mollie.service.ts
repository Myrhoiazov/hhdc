import { InvoiceStatus, Prisma } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';

const toCents = (value: Prisma.Decimal | number | string) => Math.round(Number(value) * 100);

export const calculateInvoiceStatus = (invoice: {
    status: InvoiceStatus;
    dueDate: Date | null;
    paidAmountCents: number;
    creditedAmountCents: number;
    balanceDueCents: number;
}) => {
    if (invoice.status === InvoiceStatus.CANCELLED && invoice.paidAmountCents === 0) return InvoiceStatus.CANCELLED;
    if (invoice.balanceDueCents === 0) return InvoiceStatus.PAID;
    if (invoice.status === InvoiceStatus.DRAFT) return InvoiceStatus.DRAFT;
    if (invoice.dueDate && invoice.dueDate.getTime() < Date.now()) return InvoiceStatus.OVERDUE;
    if (invoice.paidAmountCents > 0 || invoice.creditedAmountCents > 0) return InvoiceStatus.PARTIALLY_PAID;
    return InvoiceStatus.ISSUED;
};

export const getMolliePaymentNetCents = (payment: {
    amountValue: Prisma.Decimal | number | string;
    refundedAmount: Prisma.Decimal | number | string;
    chargedBackAmount: Prisma.Decimal | number | string;
    status: string;
    paidAt: Date | null;
}) => {
    if (!payment.paidAt) return 0;

    const amountCents = toCents(payment.amountValue);
    const refundedCents = toCents(payment.refundedAmount);
    const storedChargebackCents = toCents(payment.chargedBackAmount);
    const chargebackCents = payment.status === 'charged_back' && storedChargebackCents === 0
        ? amountCents
        : storedChargebackCents;

    return Math.max(0, amountCents - refundedCents - chargebackCents);
};

const loadInvoiceForReconciliation = async (invoiceId: number) => {
    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
            payments: { select: { amountCents: true, paidAt: true } },
            molliePayments: {
                select: {
                    id: true,
                    mollieId: true,
                    amountValue: true,
                    refundedAmount: true,
                    chargedBackAmount: true,
                    status: true,
                    paidAt: true,
                },
            },
        },
    });

    const manualPaidCents = invoice?.payments.reduce((sum, payment) => sum + payment.amountCents, 0) ?? 0;
    const molliePaidCents = invoice?.molliePayments.reduce((sum, payment) => sum + getMolliePaymentNetCents(payment), 0) ?? 0;
    return { invoice, paidAmountCents: manualPaidCents + molliePaidCents };
};

const resolveReconcilePaidAt = (invoice: NonNullable<Awaited<ReturnType<typeof loadInvoiceForReconciliation>>['invoice']>, balanceDueCents: number) => {
    if (balanceDueCents !== 0) return null;
    return invoice.molliePayments.map((payment) => payment.paidAt).filter((value): value is Date => Boolean(value)).sort((a, b) => b.getTime() - a.getTime())[0]
        ?? invoice.payments.map((payment) => payment.paidAt).sort((a, b) => b.getTime() - a.getTime())[0]
        ?? invoice.paidAt;
};

const persistReconciliation = async (
    transaction: Prisma.TransactionClient,
    invoiceId: number,
    previous: NonNullable<Awaited<ReturnType<typeof loadInvoiceForReconciliation>>['invoice']>,
    figures: { paidAmountCents: number; balanceDueCents: number; status: InvoiceStatus; paidAt: Date | null },
) => {
    const { paidAmountCents, balanceDueCents, status, paidAt } = figures;
    const updated = await transaction.invoice.update({
        where: { id: invoiceId },
        data: { paidAmountCents, balanceDueCents, status, paidAt },
    });
    await transaction.invoiceAuditLog.create({
        data: {
            invoiceId,
            action: 'MOLLIE_RECONCILED',
            oldValues: {
                paidAmountCents: previous.paidAmountCents,
                balanceDueCents: previous.balanceDueCents,
                status: previous.status,
                paidAt: previous.paidAt?.toISOString() ?? null,
            },
            newValues: {
                paidAmountCents,
                balanceDueCents,
                status,
                paidAt: paidAt?.toISOString() ?? null,
                molliePayments: previous.molliePayments.map((payment) => ({
                    id: payment.id,
                    mollieId: payment.mollieId,
                    status: payment.status,
                    netAmountCents: getMolliePaymentNetCents(payment),
                })),
            },
        },
    });
    return updated;
};

export const reconcileInvoiceMolliePayments = async (invoiceId: number) => {
    const { invoice, paidAmountCents } = await loadInvoiceForReconciliation(invoiceId);
    if (!invoice) return invoice;

    if (invoice.status === InvoiceStatus.CANCELLED && paidAmountCents === 0) return invoice;

    const balanceDueCents = Math.max(0, invoice.totalCents - paidAmountCents - invoice.creditedAmountCents);
    const status = calculateInvoiceStatus({ ...invoice, paidAmountCents, balanceDueCents });
    const paidAt = resolveReconcilePaidAt(invoice, balanceDueCents);

    if (
        invoice.paidAmountCents === paidAmountCents
        && invoice.balanceDueCents === balanceDueCents
        && invoice.status === status
        && invoice.paidAt?.getTime() === paidAt?.getTime()
    ) {
        return invoice;
    }

    return prisma.$transaction((transaction) =>
        persistReconciliation(transaction, invoiceId, invoice, { paidAmountCents, balanceDueCents, status, paidAt }),
    );
};
