import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { InvoiceDeliveryStatus, InvoiceDeliveryType, InvoiceDocumentType, InvoiceStatus } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { createInvoicePdf } from './invoices.pdf.service';
import { ensureInvoicePaymentLink } from './invoices.payment-link.service';

// publicToken/paymentUrl/invoiceId/createdById are intentionally omitted from every
// InvoiceDelivery response — publicToken is the unauthenticated bearer token that grants
// public view/pay access to the invoice and must never leave the server. Matches
// client/src/pages/InvoicesPage/model/types.ts InvoiceDelivery. See
// docs/spec/DDC_CRM_API_RESPONSE_SHAPE_SPEC.md.
const invoiceDeliverySelect = {
    id: true,
    type: true,
    status: true,
    recipientEmail: true,
    subject: true,
    errorMessage: true,
    sentAt: true,
    firstViewedAt: true,
    lastViewedAt: true,
    viewCount: true,
    createdAt: true,
} as const;

const money = (cents: number, currency: string) => new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency,
}).format(cents / 100);

const escapeHtml = (value: unknown) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const publicApiUrl = () => {
    if (process.env.PUBLIC_API_URL) return process.env.PUBLIC_API_URL;
    if (process.env.SERVER_URL) return `${process.env.SERVER_URL}/api/v1`;
    if (process.env.MOLLIE_WEBHOOK_URL) return process.env.MOLLIE_WEBHOOK_URL.replace(/\/mollie\/webhook\/?$/, '');
    return 'http://localhost:8080/api/v1';
};

const createTransport = () => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!host || !user || !pass) {
        throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASSWORD.');
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE === 'true' || port === 465,
        auth: { user, pass },
    });
};

const pdfBuffer = async (invoice: Parameters<typeof createInvoicePdf>[0]) => {
    const document = await createInvoicePdf(invoice);
    return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    document.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
    document.end();
    });
};

const subjectFor = (invoiceNumber: string, type: InvoiceDeliveryType) => {
    if (type === InvoiceDeliveryType.REMINDER_BEFORE_DUE) return `Reminder: invoice ${invoiceNumber} is due soon`;
    if (type === InvoiceDeliveryType.REMINDER_OVERDUE) return `Payment overdue: invoice ${invoiceNumber}`;
    return `Invoice ${invoiceNumber} from Talent Center DDC`;
};

interface EmailInvoiceFields {
    id: number;
    number: string;
    billToName: string | null;
    billToEmail: string | null;
    balanceDueCents: number;
    currency: string;
    iban: string | null;
    paymentReference: string | null;
    showPaymentButton: boolean;
    showPaymentQr: boolean;
    documentType: InvoiceDocumentType;
    status: InvoiceStatus;
    dueDate: Date | null;
}

const bankTransferInstructionsFor = (invoice: EmailInvoiceFields) => {
    if (invoice.balanceDueCents <= 0 || !invoice.iban || !invoice.paymentReference) {
        return { text: '', html: '' };
    }
    return {
        text: `\n\nBank transfer:\nIBAN: ${invoice.iban}\nReference: ${invoice.paymentReference}\nAlways include this reference so we can match your payment to the invoice.`,
        html: `<div style="margin:20px 0;padding:16px;background:#f5f6f8;border-radius:8px">
            <strong>Pay by bank transfer</strong>
            <p style="margin:8px 0 4px">IBAN: ${escapeHtml(invoice.iban)}</p>
            <p style="margin:4px 0">Reference: <strong>${escapeHtml(invoice.paymentReference)}</strong></p>
            <p style="margin:8px 0 0;color:#6b7280;font-size:13px">Always include this reference so we can match your payment to the invoice.</p>
        </div>`,
    };
};

const resolvePaymentUrlsFor = async (invoice: EmailInvoiceFields) => {
    const paymentLink = invoice.balanceDueCents > 0 && (invoice.showPaymentButton || invoice.showPaymentQr)
        ? await ensureInvoicePaymentLink(invoice)
        : null;
    const paymentUrl = paymentLink?.paymentUrl ?? null;
    return { paymentUrl, emailPaymentUrl: invoice.showPaymentButton ? paymentUrl : null };
};

const buildEmailText = (
    invoice: EmailInvoiceFields,
    subject: string,
    viewUrl: string,
    emailPaymentUrl: string | null,
    bankTransferText: string,
) => `Hello ${invoice.billToName},\n\nInvoice ${invoice.number}: ${money(invoice.balanceDueCents, invoice.currency)} due.\nView: ${viewUrl}${emailPaymentUrl ? `\nPay online: ${emailPaymentUrl}` : ''}${bankTransferText}`;

const buildEmailHtml = (
    invoice: EmailInvoiceFields,
    subject: string,
    viewUrl: string,
    emailPaymentUrl: string | null,
    bankTransferHtml: string,
) => `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#1d1d33">
        <h2>${escapeHtml(subject)}</h2>
        <p>Hello ${escapeHtml(invoice.billToName)},</p>
        <p>Balance due: <strong>${money(invoice.balanceDueCents, invoice.currency)}</strong></p>
        <p><a href="${escapeHtml(viewUrl)}" style="display:inline-block;padding:12px 18px;background:#1d1d33;color:#fff;text-decoration:none;border-radius:8px">View invoice</a></p>
        ${emailPaymentUrl ? `<p><a href="${escapeHtml(emailPaymentUrl)}" style="display:inline-block;padding:12px 18px;background:#b5d63d;color:#1d1d33;text-decoration:none;border-radius:8px;font-weight:bold">Pay with Mollie</a></p>` : ''}
        ${bankTransferHtml}
        <p style="color:#6b7280;font-size:12px">The invoice PDF is attached to this email.</p>
    </div>
`;

const loadSendableInvoice = async (invoiceId: number) => {
    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
            items: { orderBy: { id: 'asc' } },
        },
    });
    if (!invoice) throw new Error('Invoice not found');
    if (!invoice.billToEmail) throw new Error('Invoice recipient email is missing');
    if (invoice.status === InvoiceStatus.DRAFT || invoice.status === InvoiceStatus.CANCELLED) {
        throw new Error('Draft or cancelled invoice cannot be sent');
    }
    return invoice;
};

type SendableInvoice = Awaited<ReturnType<typeof loadSendableInvoice>>;

const prepareEmailDelivery = async (invoice: SendableInvoice, type: InvoiceDeliveryType, actorId?: number) => {
    const subject = subjectFor(invoice.number, type);
    const publicToken = crypto.randomBytes(32).toString('hex');
    const { paymentUrl, emailPaymentUrl } = await resolvePaymentUrlsFor(invoice);
    const { text: bankTransferText, html: bankTransferHtml } = bankTransferInstructionsFor(invoice);
    const delivery = await prisma.invoiceDelivery.create({
        data: {
            invoiceId: invoice.id,
            type,
            recipientEmail: invoice.billToEmail!,
            subject,
            publicToken,
            paymentUrl: emailPaymentUrl,
            createdById: actorId,
        },
        select: invoiceDeliverySelect,
    });
    const viewUrl = `${publicApiUrl()}/invoices/public/${publicToken}`;
    return { subject, paymentUrl, viewUrl, emailPaymentUrl, bankTransferText, bankTransferHtml, delivery };
};

const markDeliveryFailed = async (deliveryId: number, error: unknown) => prisma.invoiceDelivery.update({
    where: { id: deliveryId },
    data: {
        status: InvoiceDeliveryStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : String(error),
    },
    select: invoiceDeliverySelect,
});

export const sendInvoiceEmail = async ({
    invoiceId,
    type,
    actorId,
}: {
    invoiceId: number;
    type: InvoiceDeliveryType;
    actorId?: number;
}) => {
    const invoice = await loadSendableInvoice(invoiceId);
    const prepared = await prepareEmailDelivery(invoice, type, actorId);

    try {
        const attachment = await pdfBuffer({ ...invoice, paymentUrl: prepared.paymentUrl });
        const transporter = createTransport();
        await transporter.sendMail({
            from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
            to: invoice.billToEmail!,
            subject: prepared.subject,
            text: buildEmailText(invoice, prepared.subject, prepared.viewUrl, prepared.emailPaymentUrl, prepared.bankTransferText),
            html: buildEmailHtml(invoice, prepared.subject, prepared.viewUrl, prepared.emailPaymentUrl, prepared.bankTransferHtml),
            attachments: [{ filename: `${invoice.number}.pdf`, content: attachment, contentType: 'application/pdf' }],
        });
        return prisma.invoiceDelivery.update({
            where: { id: prepared.delivery.id },
            data: { status: InvoiceDeliveryStatus.SENT, sentAt: new Date() },
            select: invoiceDeliverySelect,
        });
    } catch (error) {
        await markDeliveryFailed(prepared.delivery.id, error);
        throw error;
    }
};

export const resolveDueReminderType = (
    dueDate: Date,
    now: Date,
    inThreeDays: Date,
): InvoiceDeliveryType | null => {
    if (dueDate < now) return InvoiceDeliveryType.REMINDER_OVERDUE;
    if (dueDate <= inThreeDays) return InvoiceDeliveryType.REMINDER_BEFORE_DUE;
    return null;
};

export const sendDueInvoiceReminders = async () => {
    const now = new Date();
    const inThreeDays = new Date(now);
    inThreeDays.setDate(inThreeDays.getDate() + 3);
    const invoices = await prisma.invoice.findMany({
        where: {
            billToEmail: { not: null },
            balanceDueCents: { gt: 0 },
            status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] },
            dueDate: { not: null },
        },
        select: { id: true, dueDate: true },
    });

    const candidates = invoices
        .map((invoice) => ({ invoice, type: resolveDueReminderType(invoice.dueDate!, now, inThreeDays) }))
        .filter((candidate): candidate is { invoice: typeof invoices[number]; type: InvoiceDeliveryType } => candidate.type !== null);

    if (!candidates.length) return;

    // Batched replacement for what used to be one findFirst per invoice inside the loop below.
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const alreadySent = await prisma.invoiceDelivery.findMany({
        where: {
            invoiceId: { in: candidates.map((candidate) => candidate.invoice.id) },
            type: { in: candidates.map((candidate) => candidate.type) },
            status: InvoiceDeliveryStatus.SENT,
            createdAt: { gte: startOfDay },
        },
        select: { invoiceId: true, type: true },
    });
    const alreadySentKeys = new Set(alreadySent.map((delivery) => `${delivery.invoiceId}:${delivery.type}`));

    for (const { invoice, type } of candidates) {
        if (alreadySentKeys.has(`${invoice.id}:${type}`)) continue;
        await sendInvoiceEmail({ invoiceId: invoice.id, type }).catch((error) => {
            console.error(`Invoice reminder failed for ${invoice.id}:`, error);
        });
    }
};
