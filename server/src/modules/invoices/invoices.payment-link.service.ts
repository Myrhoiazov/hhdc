import crypto from 'crypto';
import { InvoiceDocumentType, InvoiceStatus } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import * as mollieService from '../payments/payments.mollie.service';

export interface PayableInvoice {
    id: number;
    number: string;
    documentType: InvoiceDocumentType;
    status: InvoiceStatus;
    balanceDueCents: number;
    dueDate: Date | null;
}

const amsterdamUtcOffsetMs = (date: Date) => {
    const offsetName = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Amsterdam',
        timeZoneName: 'shortOffset',
    }).formatToParts(date).find((part) => part.type === 'timeZoneName')?.value;
    const match = offsetName?.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
    if (!match) return 0;
    const minutes = (Number(match[2]) * 60) + Number(match[3] ?? 0);
    return (match[1] === '-' ? -minutes : minutes) * 60 * 1000;
};

export const paymentLinkExpiry = (dueDate: Date | null, now: Date = new Date()) => {
    if (!dueDate) return null;
    const localEndAsUtc = Date.UTC(
        dueDate.getUTCFullYear(),
        dueDate.getUTCMonth(),
        dueDate.getUTCDate(),
        23,
        59,
        59,
        999,
    );
    const expiry = new Date(localEndAsUtc - amsterdamUtcOffsetMs(new Date(localEndAsUtc)));
    return expiry.getTime() > now.getTime() ? expiry : null;
};

const paymentLinkWebhookUrl = (token: string) => {
    const configuredUrl = process.env.MOLLIE_WEBHOOK_URL;
    if (!configuredUrl) throw new Error('MOLLIE_WEBHOOK_URL is required');
    const url = new URL(configuredUrl);
    url.searchParams.set('invoicePaymentLinkToken', token);
    return url.toString();
};

const findReusablePaymentLink = async (invoice: PayableInvoice, now: Date) => {
    const existing = await prisma.invoiceMolliePaymentLink.findFirst({
        where: {
            invoiceId: invoice.id,
            amountCents: invoice.balanceDueCents,
            archived: false,
            paidAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { createdAt: 'desc' },
    });
    return existing ? { ...existing, reused: true } : null;
};

const createPaymentLinkRecord = async (invoice: PayableInvoice) => {
    const webhookToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = paymentLinkExpiry(invoice.dueDate);
    if (invoice.dueDate && !expiresAt) return null;

    const paymentLink = await mollieService.createInvoicePaymentLink({
        amountValue: (invoice.balanceDueCents / 100).toFixed(2),
        description: `Invoice ${invoice.number}`,
        redirectUrl: mollieService.getPaymentReturnUrl(),
        webhookUrl: paymentLinkWebhookUrl(webhookToken),
        expiresAt: expiresAt?.toISOString(),
    });

    return {
        ...await prisma.invoiceMolliePaymentLink.create({
            data: {
                invoiceId: invoice.id,
                mollieId: paymentLink.id,
                paymentUrl: paymentLink.getPaymentUrl(),
                webhookToken,
                amountCents: invoice.balanceDueCents,
                expiresAt: paymentLink.expiresAt ? new Date(paymentLink.expiresAt) : expiresAt,
                archived: paymentLink.archived,
                paidAt: paymentLink.paidAt ? new Date(paymentLink.paidAt) : null,
            },
        }),
        reused: false,
    };
};

export const ensureInvoicePaymentLink = async (invoice: PayableInvoice) => {
    if (
        invoice.documentType === InvoiceDocumentType.CREDIT_NOTE
        || invoice.status === InvoiceStatus.DRAFT
        || invoice.status === InvoiceStatus.CANCELLED
        || invoice.balanceDueCents <= 0
    ) {
        return null;
    }

    const reused = await findReusablePaymentLink(invoice, new Date());
    if (reused) return reused;

    await archiveInvoicePaymentLinks(invoice.id);
    return createPaymentLinkRecord(invoice);
};

export const archiveInvoicePaymentLinks = async (invoiceId: number) => {
    const links = await prisma.invoiceMolliePaymentLink.findMany({
        where: { invoiceId, archived: false },
        select: { id: true, mollieId: true },
    });
    const failures: unknown[] = [];
    await Promise.all(links.map(async (link) => {
        const archivedRemotely = await mollieService.archivePaymentLink(link.mollieId).then(
            () => true,
            (error) => {
            failures.push(error);
                return false;
            },
        );
        if (archivedRemotely) {
            await prisma.invoiceMolliePaymentLink.update({
                where: { id: link.id },
                data: { archived: true },
            });
        }
    }));
    if (failures.length > 0) throw failures[0];
};
