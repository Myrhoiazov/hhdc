import { Request, Response } from 'express';
import { InvoiceDeliveryType, InvoiceDocumentType, InvoiceStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { createInvoicePdf } from './invoices.pdf.service';
import * as mollieService from '../payments/payments.mollie.service';
import * as mollieSyncService from '../payments/payments.sync.service';
import { sendInvoiceEmail } from './invoices.delivery.service';
import { archiveInvoicePaymentLinks, ensureInvoicePaymentLink } from './invoices.payment-link.service';

const editableStatuses = [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED] as const;
const getActorId = (req: Request) => {
    const value = (req as Request & { user?: { id?: number | string } }).user?.id;
    const actorId = Number(value);
    return Number.isInteger(actorId) && actorId > 0 ? actorId : undefined;
};

const invoiceItemSchema = z.object({
    groupId: z.coerce.number().int().positive().nullable().optional(),
    description: z.string().trim().min(1).max(191),
    period: z.string().trim().max(191).nullable().optional(),
    quantity: z.coerce.number().int().positive().max(1000).default(1),
    unitPriceCents: z.coerce.number().int().nonnegative(),
});

const createInvoiceSchema = z.object({
    clientId: z.coerce.number().int().positive().nullable().optional(),
    businessBrandId: z.coerce.number().int().positive().nullable().optional(),
    billToName: z.string().trim().min(1).max(191),
    billToEmail: z.string().trim().email().max(191).nullable().optional().or(z.literal('')),
    issueDate: z.coerce.date(),
    dueDate: z.coerce.date().nullable().optional(),
    status: z.enum(editableStatuses).default(InvoiceStatus.DRAFT),
    issuerName: z.string().trim().min(1).max(191).default('Talent Center DDC'),
    issuerAddress: z.string().trim().max(191).nullable().optional(),
    issuerEmail: z.string().trim().email().max(191).nullable().optional().or(z.literal('')),
    bankName: z.string().trim().max(191).nullable().optional(),
    iban: z.string().trim().max(191).nullable().optional(),
    note: z.string().trim().max(2000).nullable().optional(),
    showPaymentButton: z.boolean().default(true),
    showPaymentQr: z.boolean().default(true),
    items: z.array(invoiceItemSchema).min(1).max(20),
});

type IssuerSnapshot = {
    businessBrandId?: number;
    issuerName?: string;
    issuerAddress?: string | null;
    issuerEmail?: string | null;
    issuerPhone?: string | null;
    issuerWebsite?: string | null;
    issuerLegalName?: string | null;
    issuerKvkNumber?: string | null;
    issuerVatNumber?: string | null;
    issuerLogoUrl?: string | null;
    issuerPrimaryColor?: string | null;
    bankName?: string | null;
    iban?: string | null;
};

const getIssuerSnapshot = async (businessBrandId?: number | null): Promise<IssuerSnapshot> => {
    if (!businessBrandId) return {
        issuerPhone: null,
        issuerWebsite: null,
        issuerLegalName: null,
        issuerKvkNumber: null,
        issuerVatNumber: null,
        issuerLogoUrl: null,
        issuerPrimaryColor: null,
    };
    const brand = await prisma.businessBrand.findUnique({
        where: { id: businessBrandId },
        include: { organization: true },
    });
    if (!brand || !brand.isActive) throw new Error('Выбранный бренд не найден или архивирован');
    const organizationAddress = [
        brand.organization.registrationAddress,
        brand.organization.postalCode,
        brand.organization.city,
    ].filter(Boolean).join(', ') || null;
    return {
        businessBrandId: brand.id,
        issuerName: brand.name,
        issuerAddress: brand.address ?? organizationAddress,
        issuerEmail: brand.email ?? brand.organization.email,
        issuerPhone: brand.phone ?? brand.organization.phone,
        issuerWebsite: brand.website ?? brand.organization.website,
        issuerLegalName: brand.organization.legalName,
        issuerKvkNumber: brand.organization.kvkNumber,
        issuerVatNumber: brand.organization.vatNumber,
        issuerLogoUrl: brand.logoUrl,
        issuerPrimaryColor: brand.primaryColor,
        bankName: brand.organization.bankName,
        iban: brand.organization.iban,
    };
};

const paymentSchema = z.object({
    amountCents: z.coerce.number().int().positive(),
    paidAt: z.coerce.date().optional(),
    method: z.enum(['BANK_TRANSFER', 'CASH', 'CARD', 'OTHER']).default('OTHER'),
    reference: z.string().trim().max(191).nullable().optional(),
    note: z.string().trim().max(2000).nullable().optional(),
});

const paidInvoiceSchema = createInvoiceSchema.omit({ status: true, showPaymentButton: true, showPaymentQr: true }).extend({
    payment: z.object({
        paidAt: z.coerce.date(),
        method: z.enum(['BANK_TRANSFER', 'CASH', 'CARD', 'OTHER']),
        reference: z.string().trim().max(191).nullable().optional(),
        note: z.string().trim().max(2000).nullable().optional(),
    }),
});

const confirmPaidInvoiceSchema = z.object({
    paidAt: z.coerce.date(),
    method: z.enum(['BANK_TRANSFER', 'CASH', 'CARD', 'OTHER']),
    reference: z.string().trim().max(191).nullable().optional(),
    note: z.string().trim().max(2000).nullable().optional(),
});

const adjustmentSchema = z.object({
    kind: z.enum(['CREDIT', 'DEBIT']),
    amountCents: z.coerce.number().int().positive(),
    reason: z.string().trim().min(1).max(2000),
});

const invoiceInclude = {
    client: {
        select: { id: true, firstName: true, lastName: true, email: true },
    },
    businessBrand: {
        select: { id: true, name: true, logoUrl: true, primaryColor: true },
    },
    adjustments: {
        select: { id: true, number: true, documentType: true, totalCents: true, status: true },
        orderBy: { id: 'desc' as const },
    },
    items: {
        include: { group: { select: { id: true, name: true } } },
        orderBy: { id: 'asc' as const },
    },
    payments: {
        include: {
            createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { paidAt: 'desc' as const },
    },
    molliePayments: {
        select: {
            id: true,
            mollieId: true,
            status: true,
            checkoutUrl: true,
            amountValue: true,
            refundedAmount: true,
            chargedBackAmount: true,
            paidAt: true,
        },
        orderBy: { createdAt: 'desc' as const },
    },
    molliePaymentLinks: {
        select: {
            id: true,
            mollieId: true,
            paymentUrl: true,
            amountCents: true,
            expiresAt: true,
            archived: true,
            paidAt: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' as const },
    },
    // publicToken/paymentUrl/invoiceId/createdById are intentionally omitted — publicToken
    // is the unauthenticated bearer token that grants public view/pay access to the invoice
    // (see docs/spec/DDC_CRM_API_RESPONSE_SHAPE_SPEC.md) and must never leave the server;
    // matches client/src/pages/InvoicesPage/model/types.ts InvoiceDelivery.
    deliveries: {
        select: {
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
            createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' as const },
        take: 20,
    },
    auditLogs: {
        select: {
            id: true,
            action: true,
            createdAt: true,
            actor: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' as const },
        take: 20,
    },
};

// List/search view of invoices (getInvoices) — same source data as the client's edit form
// and action modal, but the client's InvoiceListItem card never reads businessBrand,
// parentInvoice, or adjustments, and only reads a subset of the payments/mollie/delivery
// fields below. Mutation responses keep the full `invoiceInclude` (minus `parentInvoice`,
// which no client code references at all). See docs/spec/DDC_CRM_API_RESPONSE_SHAPE_SPEC.md.
const invoiceListInclude = {
    client: {
        select: { id: true },
    },
    items: {
        select: {
            id: true,
            description: true,
            period: true,
            quantity: true,
            unitPriceCents: true,
            totalCents: true,
            group: { select: { id: true } },
        },
        orderBy: { id: 'asc' as const },
    },
    payments: {
        select: {
            id: true,
            amountCents: true,
            method: true,
            paidAt: true,
            reference: true,
        },
        orderBy: { paidAt: 'desc' as const },
    },
    molliePayments: {
        select: {
            id: true,
            mollieId: true,
            status: true,
            refundedAmount: true,
            chargedBackAmount: true,
        },
        orderBy: { createdAt: 'desc' as const },
    },
    molliePaymentLinks: {
        select: {
            id: true,
            mollieId: true,
            expiresAt: true,
            archived: true,
            paidAt: true,
        },
        orderBy: { createdAt: 'desc' as const },
    },
    deliveries: {
        select: {
            id: true,
            type: true,
            status: true,
            recipientEmail: true,
            createdAt: true,
            errorMessage: true,
            viewCount: true,
        },
        orderBy: { createdAt: 'desc' as const },
        take: 20,
    },
    auditLogs: {
        select: {
            id: true,
            action: true,
            createdAt: true,
            actor: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' as const },
        take: 20,
    },
};

// Minimum fields needed for confirmPaidInvoice — existence check + eligibility + totalCents
// for the payment record. See docs/spec/DDC_CRM_API_RESPONSE_SHAPE_SPEC.md.
export const invoiceConfirmSelect = {
    id: true,
    documentType: true,
    status: true,
    totalCents: true,
} satisfies Prisma.InvoiceSelect;

// Fields needed for recordInvoicePayment — eligibility check + payment calculation + audit.
// Matches the PaymentRecordInvoice type. See docs/spec/DDC_CRM_API_RESPONSE_SHAPE_SPEC.md.
export const invoicePaymentRecordSelect = {
    id: true,
    documentType: true,
    status: true,
    totalCents: true,
    paidAmountCents: true,
    creditedAmountCents: true,
    balanceDueCents: true,
    dueDate: true,
} satisfies Prisma.InvoiceSelect;

// Fields needed for createInvoiceAdjustment — source document data for credit/debit notes.
// Matches the AdjustmentSourceInvoice type. See docs/spec/DDC_CRM_API_RESPONSE_SHAPE_SPEC.md.
export const invoiceAdjustmentSourceSelect = {
    id: true,
    number: true,
    documentType: true,
    status: true,
    clientId: true,
    billToName: true,
    billToEmail: true,
    dueDate: true,
    currency: true,
    totalCents: true,
    paidAmountCents: true,
    creditedAmountCents: true,
    issuerName: true,
    issuerAddress: true,
    issuerEmail: true,
    bankName: true,
    iban: true,
    showPaymentButton: true,
    showPaymentQr: true,
} satisfies Prisma.InvoiceSelect;

/** Deep-clone value for audit-log snapshot. JSON.stringify guarantees valid JSON output, so JSON.parse is safe — no runtime validation needed. */
const snapshot = (value: unknown): Prisma.InputJsonValue => (
    JSON.parse(JSON.stringify(value, (key, nestedValue) => (
        key === 'auditLogs' ? undefined : nestedValue
    ))) as Prisma.InputJsonValue
);

const createAuditLog = (
    transaction: Prisma.TransactionClient,
    params: {
        invoiceId: number;
        action: string;
        actorId: number | undefined;
        oldValues?: unknown;
        newValues?: unknown;
    },
) => transaction.invoiceAuditLog.create({
    data: {
        invoiceId: params.invoiceId,
        action: params.action,
        actorId: params.actorId,
        ...(params.oldValues === undefined ? {} : { oldValues: snapshot(params.oldValues) }),
        ...(params.newValues === undefined ? {} : { newValues: snapshot(params.newValues) }),
    },
});

const nextDocumentNumber = async (
    transaction: Prisma.TransactionClient,
    issueDate: Date,
    prefix: 'INV' | 'CRN' | 'DBN' = 'INV',
) => {
    const year = issueDate.getFullYear();
    const numberPrefix = `${prefix}-${year}-`;
    const latest = await transaction.invoice.findFirst({
        where: { number: { startsWith: numberPrefix } },
        orderBy: { number: 'desc' },
        select: { number: true },
    });
    const sequence = latest ? Number(latest.number.slice(numberPrefix.length)) + 1 : 1;
    return `${numberPrefix}${String(sequence).padStart(3, '0')}`;
};

const calculateStatus = (invoice: {
    status: InvoiceStatus;
    dueDate: Date | null;
    paidAmountCents: number;
    creditedAmountCents: number;
    balanceDueCents: number;
}) => {
    if (invoice.status === InvoiceStatus.CANCELLED) return InvoiceStatus.CANCELLED;
    if (invoice.balanceDueCents === 0) return InvoiceStatus.PAID;
    if (invoice.status === InvoiceStatus.DRAFT) return InvoiceStatus.DRAFT;
    if (invoice.dueDate && invoice.dueDate.getTime() < Date.now()) return InvoiceStatus.OVERDUE;
    if (invoice.paidAmountCents > 0 || invoice.creditedAmountCents > 0) return InvoiceStatus.PARTIALLY_PAID;
    return InvoiceStatus.ISSUED;
};

const isFinanciallyLocked = (invoice: {
    documentType: InvoiceDocumentType;
    status: InvoiceStatus;
    paidAmountCents: number;
    creditedAmountCents: number;
}) => (
    invoice.documentType !== InvoiceDocumentType.INVOICE
    || invoice.status === InvoiceStatus.PAID
    || invoice.status === InvoiceStatus.CANCELLED
    || invoice.paidAmountCents > 0
    || invoice.creditedAmountCents > 0
);

type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
type CreateInvoiceData = z.infer<typeof createInvoiceSchema>;

const calculateTotalCents = (items: InvoiceItemInput[]) =>
    items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);

const mapInvoiceItemCreates = (items: InvoiceItemInput[]) =>
    items.map((item) => ({
        groupId: item.groupId ?? null,
        description: item.description,
        period: item.period ?? null,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        totalCents: item.quantity * item.unitPriceCents,
    }));

// Archives Mollie payment links before a financial mutation. Returns true on success,
// or writes the 502 response and returns false — the caller must stop and return.
const archivePaymentLinksSafe = async (
    id: number,
    res: Response,
    logSuffix: string,
    userMessage: string,
): Promise<boolean> => {
    try {
        await archiveInvoicePaymentLinks(id);
        return true;
    } catch (error) {
        console.error(`Unable to archive Mollie payment links ${logSuffix}:`, error);
        res.status(502).json({ message: userMessage });
        return false;
    }
};

const buildPaidInvoiceCreateData = (params: {
    number: string;
    data: z.infer<typeof paidInvoiceSchema>;
    totalCents: number;
    issuerSnapshot: IssuerSnapshot;
    issuerAddress: string | null;
    actorId?: number;
}) => ({
    number: params.number,
    status: InvoiceStatus.PAID,
    clientId: params.data.clientId ?? null,
    businessBrandId: params.data.businessBrandId ?? null,
    billToName: params.data.billToName,
    billToEmail: params.data.billToEmail || null,
    issueDate: params.data.issueDate,
    dueDate: params.data.dueDate ?? null,
    paidAt: params.data.payment.paidAt,
    totalCents: params.totalCents,
    paidAmountCents: params.totalCents,
    balanceDueCents: 0,
    issuerName: params.data.issuerName,
    issuerEmail: params.data.issuerEmail || null,
    bankName: params.data.bankName ?? null,
    iban: params.data.iban ?? null,
    paymentReference: params.number,
    note: params.data.note ?? null,
    showPaymentButton: false,
    showPaymentQr: false,
    ...params.issuerSnapshot,
    issuerAddress: params.issuerAddress,
    createdById: params.actorId,
    updatedById: params.actorId,
    items: { create: mapInvoiceItemCreates(params.data.items) },
    payments: {
        create: {
            amountCents: params.totalCents,
            paidAt: params.data.payment.paidAt,
            method: params.data.payment.method,
            reference: params.data.payment.reference || null,
            note: params.data.payment.note || null,
            createdById: params.actorId,
        },
    },
});

const buildInvoiceUpdateData = (params: {
    data: CreateInvoiceData;
    totalCents: number;
    issuerSnapshot: IssuerSnapshot;
    issuerAddress: string | null;
    existing: { paidAmountCents: number; creditedAmountCents: number };
    actorId?: number;
}) => ({
    status: params.data.status,
    clientId: params.data.clientId ?? null,
    businessBrandId: params.data.businessBrandId ?? null,
    billToName: params.data.billToName,
    billToEmail: params.data.billToEmail || null,
    issueDate: params.data.issueDate,
    dueDate: params.data.dueDate ?? null,
    totalCents: params.totalCents,
    balanceDueCents: Math.max(0, params.totalCents - params.existing.paidAmountCents - params.existing.creditedAmountCents),
    issuerName: params.data.issuerName,
    issuerEmail: params.data.issuerEmail || null,
    bankName: params.data.bankName ?? null,
    iban: params.data.iban ?? null,
    note: params.data.note ?? null,
    showPaymentButton: params.data.showPaymentButton,
    showPaymentQr: params.data.showPaymentQr,
    ...params.issuerSnapshot,
    issuerAddress: params.issuerAddress,
    updatedById: params.actorId,
    items: { create: mapInvoiceItemCreates(params.data.items) },
});

const calculatePaymentResult = (existing: {
    status: InvoiceStatus;
    dueDate: Date | null;
    paidAmountCents: number;
    creditedAmountCents: number;
    balanceDueCents: number;
    totalCents: number;
}, amountCents: number) => {
    const paidAmountCents = existing.paidAmountCents + amountCents;
    const balanceDueCents = existing.totalCents - paidAmountCents - existing.creditedAmountCents;
    return {
        paidAmountCents,
        balanceDueCents,
        nextStatus: calculateStatus({ ...existing, paidAmountCents, balanceDueCents }),
    };
};

type OverdueInvoice = {
    id: number;
    status: InvoiceStatus;
    dueDate: Date | null;
    balanceDueCents: number;
};

export const buildOverdueAuditRecords = (
    overdueInvoices: OverdueInvoice[],
): Prisma.InvoiceAuditLogCreateManyInput[] => overdueInvoices.map((invoice): Prisma.InvoiceAuditLogCreateManyInput => ({
    invoiceId: invoice.id,
    action: 'MARKED_OVERDUE',
    actorId: undefined,
    oldValues: snapshot(invoice),
    newValues: snapshot({ ...invoice, status: InvoiceStatus.OVERDUE }),
}));

const markOverdueInvoices = async () => {
    const overdueInvoices = await prisma.invoice.findMany({
        where: {
            status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
            dueDate: { lt: new Date() },
            balanceDueCents: { gt: 0 },
        },
        select: { id: true, status: true, dueDate: true, balanceDueCents: true },
    });
    if (!overdueInvoices.length) return 0;
    await prisma.$transaction([
        prisma.invoice.updateMany({
            where: { id: { in: overdueInvoices.map((invoice) => invoice.id) } },
            data: { status: InvoiceStatus.OVERDUE },
        }),
        prisma.invoiceAuditLog.createMany({
            data: buildOverdueAuditRecords(overdueInvoices),
        }),
    ]);
    return overdueInvoices.length;
};

export const syncOverdueInvoices = async (_req: Request, res: Response) => {
    const count = await markOverdueInvoices();
    return res.json({ marked: count });
};

export const getInvoices = async (req: Request, res: Response) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const query = typeof req.query._q === 'string' ? req.query._q.trim() : '';
    const page = Math.max(Number(req.query._page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query._limit) || 15, 1), 100);
    const where: Prisma.InvoiceWhereInput = {
        ...(status && status !== 'ALL' && Object.values(InvoiceStatus).includes(status as InvoiceStatus)
            ? { status: status as InvoiceStatus }
            : {}),
        ...(query ? {
            OR: [
                { number: { contains: query } },
                { billToName: { contains: query } },
                { billToEmail: { contains: query } },
                { paymentReference: { contains: query } },
                { payments: { some: { reference: { contains: query } } } },
                { molliePayments: { some: { mollieId: { contains: query } } } },
            ],
        } : {}),
    };
    const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
            where,
            include: invoiceListInclude,
            orderBy: [{ issueDate: 'desc' }, { id: 'desc' }],
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.invoice.count({ where }),
    ]);
    return res.json({
        items: invoices,
        total,
        page,
        limit,
        totalPages: Math.max(Math.ceil(total / limit), 1),
    });
};

const createInvoiceInTransaction = async (
    transaction: Prisma.TransactionClient,
    data: z.infer<typeof createInvoiceSchema>,
    actorId: number,
    issuerSnapshot: IssuerSnapshot,
) => {
    const number = await nextDocumentNumber(transaction, data.issueDate);
    const totalCents = calculateTotalCents(data.items);
    const created = await transaction.invoice.create({
        data: {
            number,
            status: data.status,
            clientId: data.clientId ?? null,
            businessBrandId: data.businessBrandId ?? null,
            billToName: data.billToName,
            billToEmail: data.billToEmail || null,
            issueDate: data.issueDate,
            dueDate: data.dueDate ?? null,
            totalCents,
            balanceDueCents: totalCents,
            issuerName: data.issuerName,
            issuerEmail: data.issuerEmail || null,
            bankName: data.bankName ?? null,
            iban: data.iban ?? null,
            paymentReference: number,
            note: data.note ?? null,
            showPaymentButton: data.showPaymentButton,
            showPaymentQr: data.showPaymentQr,
            ...issuerSnapshot,
            issuerAddress: data.issuerAddress ?? issuerSnapshot.issuerAddress ?? null,
            createdById: actorId,
            updatedById: actorId,
            items: { create: mapInvoiceItemCreates(data.items) },
        },
        include: invoiceInclude,
    });
    await createAuditLog(transaction, {
        invoiceId: created.id,
        action: 'CREATED',
        actorId,
        oldValues: undefined,
        newValues: created,
    });
    return created;
};

export const createInvoice = async (req: Request, res: Response) => {
    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Проверьте данные инвойса', details: parsed.error.flatten() });
    }

    const data = parsed.data;
    const actorId = getActorId(req);
    const issuerSnapshot = await getIssuerSnapshot(data.businessBrandId);
    const invoice = await prisma.$transaction((transaction) =>
        createInvoiceInTransaction(transaction, data, actorId, issuerSnapshot),
    );
    return res.status(201).json(invoice);
};

export const createPaidInvoice = async (req: Request, res: Response) => {
    const parsed = paidInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Проверьте данные оплаченного инвойса', details: parsed.error.flatten() });
    }

    const data = parsed.data;
    const actorId = getActorId(req);
    const issuerSnapshot = await getIssuerSnapshot(data.businessBrandId);
    const invoice = await prisma.$transaction(async (transaction) => {
        const number = await nextDocumentNumber(transaction, data.issueDate);
        const totalCents = calculateTotalCents(data.items);
        if (totalCents <= 0) throw new Error('Сумма оплаченного инвойса должна быть больше нуля');
        const created = await transaction.invoice.create({
            data: buildPaidInvoiceCreateData({
                number,
                data,
                totalCents,
                issuerSnapshot,
                issuerAddress: data.issuerAddress ?? issuerSnapshot.issuerAddress ?? null,
                actorId,
            }),
            include: invoiceInclude,
        });
        await createAuditLog(transaction, {
            invoiceId: created.id,
            action: 'CREATED_PAID',
            actorId,
            oldValues: undefined,
            newValues: created,
        });
        return created;
    });
    return res.status(201).json(invoice);
};

type InvoiceConfirmData = NonNullable<Awaited<ReturnType<typeof prisma.invoice.findUnique<{ where: { id: number }; select: typeof invoiceConfirmSelect }>>>>;

const confirmPaidInvoiceInTransaction = async (
    transaction: Prisma.TransactionClient,
    id: number,
    existing: InvoiceConfirmData,
    data: z.infer<typeof confirmPaidInvoiceSchema>,
    actorId: number,
) => {
    await transaction.invoicePayment.create({
        data: {
            invoiceId: id,
            amountCents: existing.totalCents,
            paidAt: data.paidAt,
            method: data.method,
            reference: data.reference || null,
            note: data.note ?? null,
            createdById: actorId,
        },
    });
    const updated = await transaction.invoice.update({
        where: { id },
        data: {
            status: InvoiceStatus.PAID,
            paidAt: data.paidAt,
            paidAmountCents: existing.totalCents,
            balanceDueCents: 0,
            showPaymentButton: false,
            showPaymentQr: false,
            updatedById: actorId,
        },
        include: invoiceInclude,
    });
    await createAuditLog(transaction, {
        invoiceId: id,
        action: 'DRAFT_CONFIRMED_PAID',
        actorId,
        oldValues: existing,
        newValues: updated,
    });
    return updated;
};

export const confirmPaidInvoice = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = confirmPaidInvoiceSchema.safeParse(req.body);
    if (!id || !parsed.success) {
        return res.status(400).json({
            message: 'Проверьте данные оплаты',
            details: parsed.success ? undefined : parsed.error.flatten(),
        });
    }

    const existing = await prisma.invoice.findUnique({ where: { id }, select: invoiceConfirmSelect });
    if (!existing) return res.status(404).json({ message: 'Инвойс не найден' });
    if (existing.documentType !== InvoiceDocumentType.INVOICE || existing.status !== InvoiceStatus.DRAFT) {
        return res.status(409).json({ message: 'Подтвердить оплату можно только для черновика инвойса' });
    }
    if (existing.totalCents <= 0) {
        return res.status(409).json({ message: 'Сумма инвойса должна быть больше нуля' });
    }

    const actorId = getActorId(req);
    const invoice = await prisma.$transaction((transaction) =>
        confirmPaidInvoiceInTransaction(transaction, id, existing, parsed.data, actorId),
    );
    return res.json(invoice);
};

type UpdateInvoiceTransactionParams = {
    transaction: Prisma.TransactionClient;
    id: number;
    data: z.infer<typeof createInvoiceSchema>;
    existing: NonNullable<Awaited<ReturnType<typeof prisma.invoice.findUnique>>>;
    issuerSnapshot: IssuerSnapshot;
    actorId: number | undefined;
};

const updateInvoiceInTransaction = async ({
    transaction,
    id,
    data,
    existing,
    issuerSnapshot,
    actorId,
}: UpdateInvoiceTransactionParams) => {
    const totalCents = calculateTotalCents(data.items);
    await transaction.invoiceItem.deleteMany({ where: { invoiceId: id } });
    const updated = await transaction.invoice.update({
        where: { id },
        data: buildInvoiceUpdateData({
            data,
            totalCents,
            issuerSnapshot,
            issuerAddress: data.issuerAddress ?? issuerSnapshot.issuerAddress ?? null,
            existing,
            actorId,
        }),
        include: invoiceInclude,
    });
    await createAuditLog(transaction, {
        invoiceId: id,
        action: 'UPDATED',
        actorId,
        oldValues: existing,
        newValues: updated,
    });
    return updated;
};

export const updateInvoice = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!id || !parsed.success) {
        return res.status(400).json({
            message: 'Проверьте данные инвойса',
            details: parsed.success ? undefined : parsed.error.flatten(),
        });
    }

    const existing = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
    if (!existing) return res.status(404).json({ message: 'Инвойс не найден' });
    if (isFinanciallyLocked(existing)) {
        return res.status(409).json({ message: 'Оплаченные, скорректированные и отменённые документы нельзя редактировать' });
    }

    const data = parsed.data;
    const actorId = getActorId(req);
    const issuerSnapshot = await getIssuerSnapshot(data.businessBrandId);
    const totalCents = calculateTotalCents(data.items);
    const paymentTermsChanged = totalCents !== existing.totalCents
        || data.status !== existing.status
        || (data.dueDate?.getTime() ?? null) !== (existing.dueDate?.getTime() ?? null);
    if (paymentTermsChanged) {
        const archived = await archivePaymentLinksSafe(
            id,
            res,
            `before editing invoice ${id}`,
            'Не удалось обновить ссылку оплаты в Mollie. Инвойс не был изменён.',
        );
        if (!archived) return;
    }
    const invoice = await prisma.$transaction((transaction) =>
        updateInvoiceInTransaction({
            transaction,
            id,
            data,
            existing,
            issuerSnapshot,
            actorId,
        }),
    );

    return res.json(invoice);
};

const fetchInvoiceForStatusUpdate = (id: number) => prisma.invoice.findUnique({
    where: { id },
    include: {
        molliePayments: {
            select: { mollieId: true },
        },
    },
});

type InvoiceForStatusUpdate = NonNullable<Awaited<ReturnType<typeof fetchInvoiceForStatusUpdate>>>;

// Cancels every still-active Mollie payment linked to the invoice before we cancel the
// invoice itself. Returns the refreshed invoice on success, or the {status, message}
// the caller should respond with — the caller can't tell the difference between "not
// found" and "locked" and "Mollie rejected it" any other way without repeating this logic.
const refreshRemotePayments = async (existing: InvoiceForStatusUpdate) => Promise.all(existing.molliePayments.map(async (payment) => {
    if (!payment.mollieId) {
        throw new Error('Связанный платёж Mollie не содержит идентификатор');
    }
    const remotePayment = await mollieService.getPaymentById(payment.mollieId);
    await mollieSyncService.syncMolliePayment(remotePayment);
    return remotePayment;
}));

const markRemotelyExpiredPayments = async (remotePayments: Awaited<ReturnType<typeof refreshRemotePayments>>) => {
    const remotelyExpiredPayments = remotePayments.filter((payment) => (
        payment.status === 'open'
        && payment.expiresAt
        && new Date(payment.expiresAt).getTime() <= Date.now()
    ));
    if (remotelyExpiredPayments.length > 0) {
        await prisma.payment.updateMany({
            where: {
                mollieId: { in: remotelyExpiredPayments.map((payment) => payment.id) },
            },
            data: {
                status: 'expired',
                checkoutUrl: null,
                isCancelable: false,
            },
        });
    }
    return remotelyExpiredPayments;
};

const cancelRemainingActivePayments = async (remotePayments: Awaited<ReturnType<typeof refreshRemotePayments>>) => {
    const finalStatuses = new Set(['paid', 'canceled', 'expired', 'failed']);
    const remotelyExpiredIds = new Set(remotePayments.filter((payment) => (
        payment.status === 'open'
        && payment.expiresAt
        && new Date(payment.expiresAt).getTime() <= Date.now()
    )).map((payment) => payment.id));
    const activePayments = remotePayments.filter((payment) => (
        !finalStatuses.has(payment.status) && !remotelyExpiredIds.has(payment.id)
    ));

    const nonCancelablePayment = activePayments.find((payment) => !payment.isCancelable);
    if (nonCancelablePayment) {
        return {
            status: 409,
            message: `Mollie не разрешает отменить активный платёж ${nonCancelablePayment.id}`,
        };
    }

    for (const payment of activePayments) {
        const cancelledPayment = await mollieService.cancelPaymentById(payment.id);
        await mollieSyncService.syncMolliePayment(cancelledPayment);
    }

    return null;
};

const cancelInvoiceMolliePayments = async (
    id: number,
    existing: InvoiceForStatusUpdate,
): Promise<{ invoice: InvoiceForStatusUpdate } | { status: number; message: string }> => {
    try {
        const remotePayments = await refreshRemotePayments(existing);

        const refreshed = await fetchInvoiceForStatusUpdate(id);
        if (!refreshed) return { status: 404, message: 'Инвойс не найден' };
        if (isFinanciallyLocked(refreshed)) {
            return { status: 409, message: 'Инвойс с оплатой или корректировкой нельзя отменить' };
        }

        await markRemotelyExpiredPayments(remotePayments);

        const cancelError = await cancelRemainingActivePayments(remotePayments);
        if (cancelError) return cancelError;

        return { invoice: refreshed };
    } catch (error) {
        console.error(`Unable to cancel Mollie payments for invoice ${id}:`, error);
        return {
            status: 502,
            message: 'Не удалось отменить связанные платежи в Mollie. Инвойс не был отменён.',
        };
    }
};

const updateStatusInTransaction = async (
    transaction: Prisma.TransactionClient,
    id: number,
    status: InvoiceStatus,
    existing: InvoiceForStatusUpdate,
    actorId: number,
) => {
    const updated = await transaction.invoice.update({
        where: { id },
        data: {
            status,
            balanceDueCents: status === InvoiceStatus.CANCELLED ? 0 : existing.totalCents,
            updatedById: actorId,
        },
        include: invoiceInclude,
    });
    await createAuditLog(transaction, {
        invoiceId: id,
        action: status === InvoiceStatus.CANCELLED ? 'CANCELLED' : 'STATUS_CHANGED',
        actorId,
        oldValues: existing,
        newValues: updated,
    });
    return updated;
};

export const updateInvoiceStatus = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = z.object({ status: z.enum([InvoiceStatus.DRAFT, InvoiceStatus.ISSUED, InvoiceStatus.CANCELLED]) }).safeParse(req.body);
    if (!id || !parsed.success) return res.status(400).json({ message: 'Некорректный статус' });

    let existing = await fetchInvoiceForStatusUpdate(id);
    if (!existing) return res.status(404).json({ message: 'Инвойс не найден' });

    if (parsed.data.status === InvoiceStatus.CANCELLED && existing.molliePayments.length > 0) {
        const result = await cancelInvoiceMolliePayments(id, existing);
        if ('status' in result) {
            return res.status(result.status).json({ message: result.message });
        }
        existing = result.invoice;
    }

    if (parsed.data.status === InvoiceStatus.CANCELLED) {
        const archived = await archivePaymentLinksSafe(
            id,
            res,
            `for invoice ${id}`,
            'Не удалось отключить ссылку оплаты в Mollie. Инвойс не был отменён.',
        );
        if (!archived) return;
    }

    if (isFinanciallyLocked(existing)) {
        return res.status(409).json({ message: 'Статус оплаченного, скорректированного или отменённого документа нельзя изменить' });
    }

    const actorId = getActorId(req);
    const status = parsed.data.status;
    const invoice = await prisma.$transaction((transaction) =>
        updateStatusInTransaction(transaction, id, status, existing, actorId),
    );
    return res.json(invoice);
};

const validateInvoicePaymentEligibility = (
    invoice: { documentType: InvoiceDocumentType; status: InvoiceStatus; balanceDueCents: number },
    amountCents: number,
): string | null => {
    if (
        invoice.documentType === InvoiceDocumentType.CREDIT_NOTE
        || invoice.status === InvoiceStatus.DRAFT
        || invoice.status === InvoiceStatus.CANCELLED
    ) {
        return 'Для этого документа нельзя зарегистрировать оплату';
    }
    if (amountCents > invoice.balanceDueCents) {
        return 'Сумма оплаты превышает остаток задолженности';
    }
    return null;
};

const recordPaymentTransaction = async (
    transaction: Prisma.TransactionClient,
    id: number,
    existing: PaymentRecordInvoice,
    payment: z.infer<typeof paymentSchema>,
    actorId: number,
) => {
    const { paidAmountCents, balanceDueCents, nextStatus } = calculatePaymentResult(existing, payment.amountCents);
    await transaction.invoicePayment.create({
        data: {
            invoiceId: id,
            amountCents: payment.amountCents,
            paidAt: payment.paidAt ?? new Date(),
            method: payment.method,
            reference: payment.reference || null,
            note: payment.note ?? null,
            createdById: actorId,
        },
    });
    const updated = await transaction.invoice.update({
        where: { id },
        data: {
            paidAmountCents,
            balanceDueCents,
            status: nextStatus,
            paidAt: balanceDueCents === 0 ? payment.paidAt ?? new Date() : null,
            updatedById: actorId,
        },
        include: invoiceInclude,
    });
    await createAuditLog(transaction, {
        invoiceId: id,
        action: 'PAYMENT_RECORDED',
        actorId,
        oldValues: existing,
        newValues: {
            amountCents: payment.amountCents,
            invoice: updated,
        },
    });
    return updated;
};

export const recordInvoicePayment = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = paymentSchema.safeParse(req.body);
    if (!id || !parsed.success) {
        return res.status(400).json({ message: 'Проверьте сумму оплаты', details: parsed.success ? undefined : parsed.error.flatten() });
    }

    const existing = await prisma.invoice.findUnique({ where: { id }, select: invoicePaymentRecordSelect });
    if (!existing) return res.status(404).json({ message: 'Инвойс не найден' });

    const eligibilityError = validateInvoicePaymentEligibility(existing, parsed.data.amountCents);
    if (eligibilityError) return res.status(409).json({ message: eligibilityError });

    const archived = await archivePaymentLinksSafe(
        id,
        res,
        `before recording payment for invoice ${id}`,
        'Не удалось обновить ссылку оплаты в Mollie. Оплата не была зарегистрирована.',
    );
    if (!archived) return;

    const invoice = await prisma.$transaction((transaction) =>
        recordPaymentTransaction(transaction, id, existing, parsed.data, getActorId(req)),
    );
    return res.status(201).json(invoice);
};

const validateInvoiceAdjustmentEligibility = (
    original: { documentType: InvoiceDocumentType; status: InvoiceStatus; totalCents: number; creditedAmountCents: number },
    data: z.infer<typeof adjustmentSchema>,
): string | null => {
    if (
        original.documentType !== InvoiceDocumentType.INVOICE
        || original.status === InvoiceStatus.DRAFT
        || original.status === InvoiceStatus.CANCELLED
    ) {
        return 'Этот документ нельзя корректировать';
    }
    if (data.kind === 'CREDIT' && data.amountCents > original.totalCents - original.creditedAmountCents) {
        return 'Общая сумма кредит-нот не может превышать сумму инвойса';
    }
    return null;
};

type PaymentRecordInvoice = {
    id: number;
    documentType: InvoiceDocumentType;
    status: InvoiceStatus;
    totalCents: number;
    paidAmountCents: number;
    creditedAmountCents: number;
    balanceDueCents: number;
    dueDate: Date | null;
};

type AdjustmentSourceInvoice = {
    id: number;
    number: string;
    documentType: InvoiceDocumentType;
    status: InvoiceStatus;
    clientId: number | null;
    billToName: string | null;
    billToEmail: string | null;
    dueDate: Date | null;
    currency: string;
    totalCents: number;
    paidAmountCents: number;
    creditedAmountCents: number;
    issuerName: string | null;
    issuerAddress: string | null;
    issuerEmail: string | null;
    bankName: string | null;
    iban: string | null;
    showPaymentButton: boolean;
    showPaymentQr: boolean;
};

type AdjustmentInvoiceDataParams = {
    number: string;
    isCredit: boolean;
    issueDate: Date;
    original: AdjustmentSourceInvoice;
    data: z.infer<typeof adjustmentSchema>;
    actorId: number | undefined;
};

export const buildAdjustmentInvoiceData = ({
    number,
    isCredit,
    issueDate,
    original,
    data,
    actorId,
}: AdjustmentInvoiceDataParams) => ({
    number,
    documentType: isCredit ? InvoiceDocumentType.CREDIT_NOTE : InvoiceDocumentType.DEBIT_NOTE,
    parentInvoiceId: original.id,
    status: isCredit ? InvoiceStatus.PAID : InvoiceStatus.ISSUED,
    clientId: original.clientId,
    billToName: original.billToName,
    billToEmail: original.billToEmail,
    issueDate,
    dueDate: isCredit ? null : original.dueDate,
    paidAt: isCredit ? issueDate : null,
    currency: original.currency,
    totalCents: data.amountCents,
    balanceDueCents: isCredit ? 0 : data.amountCents,
    issuerName: original.issuerName,
    issuerAddress: original.issuerAddress,
    issuerEmail: original.issuerEmail,
    bankName: original.bankName,
    iban: original.iban,
    paymentReference: number,
    note: data.reason,
    showPaymentButton: isCredit ? false : original.showPaymentButton,
    showPaymentQr: isCredit ? false : original.showPaymentQr,
    createdById: actorId,
    updatedById: actorId,
    items: {
        create: {
            description: `${isCredit ? 'Кредит-нота' : 'Корректировка'} к ${original.number}: ${data.reason}`,
            quantity: 1,
            unitPriceCents: data.amountCents,
            totalCents: data.amountCents,
        },
    },
});

const applyCreditAdjustment = async (
    transaction: Prisma.TransactionClient,
    original: AdjustmentSourceInvoice,
    creditNote: Awaited<ReturnType<typeof createAdjustmentDocument>>,
    data: z.infer<typeof adjustmentSchema>,
    actorId: number,
) => {
    const creditedAmountCents = original.creditedAmountCents + data.amountCents;
    const balanceDueCents = Math.max(0, original.totalCents - original.paidAmountCents - creditedAmountCents);
    const updatedOriginal = await transaction.invoice.update({
        where: { id: original.id },
        data: {
            creditedAmountCents,
            balanceDueCents,
            status: calculateStatus({ ...original, creditedAmountCents, balanceDueCents }),
            updatedById: actorId,
        },
    });
    await createAuditLog(transaction, {
        invoiceId: original.id,
        action: 'CREDIT_NOTE_APPLIED',
        actorId,
        oldValues: original,
        newValues: {
            creditNoteId: creditNote.id,
            invoice: updatedOriginal,
        },
    });
};

const createAdjustmentDocument = async (
    transaction: Prisma.TransactionClient,
    original: AdjustmentSourceInvoice,
    data: z.infer<typeof adjustmentSchema>,
    actorId: number,
) => {
    const isCredit = data.kind === 'CREDIT';
    const issueDate = new Date();
    const number = await nextDocumentNumber(transaction, issueDate, isCredit ? 'CRN' : 'DBN');
    const created = await transaction.invoice.create({
        data: buildAdjustmentInvoiceData({
            number,
            isCredit,
            issueDate,
            original,
            data,
            actorId,
        }),
        include: invoiceInclude,
    });

    if (isCredit) {
        await applyCreditAdjustment(transaction, original, created, data, actorId);
    } else {
        await createAuditLog(transaction, {
            invoiceId: original.id,
            action: 'DEBIT_NOTE_CREATED',
            actorId,
            oldValues: original,
            newValues: { debitNoteId: created.id },
        });
    }
    await createAuditLog(transaction, {
        invoiceId: created.id,
        action: 'CREATED',
        actorId,
        oldValues: undefined,
        newValues: created,
    });
    return created;
};

export const createInvoiceAdjustment = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = adjustmentSchema.safeParse(req.body);
    if (!id || !parsed.success) {
        return res.status(400).json({ message: 'Проверьте данные корректировки', details: parsed.success ? undefined : parsed.error.flatten() });
    }

    const original = await prisma.invoice.findUnique({ where: { id }, select: invoiceAdjustmentSourceSelect });
    if (!original) return res.status(404).json({ message: 'Инвойс не найден' });

    const eligibilityError = validateInvoiceAdjustmentEligibility(original, parsed.data);
    if (eligibilityError) return res.status(409).json({ message: eligibilityError });

    if (parsed.data.kind === 'CREDIT') {
        try {
            await archiveInvoicePaymentLinks(id);
        } catch (error) {
            console.error(`Unable to archive Mollie payment links before crediting invoice ${id}:`, error);
            return res.status(502).json({
                message: 'Не удалось обновить ссылку оплаты в Mollie. Кредит-нота не была создана.',
            });
        }
    }

    const adjustment = await prisma.$transaction((transaction) =>
        createAdjustmentDocument(transaction, original, parsed.data, getActorId(req)),
    );

    return res.status(201).json(adjustment);
};

export const getInvoiceHistory = async (req: Request, res: Response) => {
    const invoiceId = Number(req.params.id);
    if (!invoiceId) return res.status(400).json({ message: 'Некорректный инвойс' });
    const history = await prisma.invoiceAuditLog.findMany({
        where: { invoiceId },
        include: {
            actor: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    return res.json(history);
};

export const createInvoicePaymentLink = async (req: Request, res: Response) => {
    const invoiceId = Number(req.params.id);
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return res.status(404).json({ message: 'Инвойс не найден' });
    if (
        invoice.documentType === InvoiceDocumentType.CREDIT_NOTE
        || invoice.status === InvoiceStatus.DRAFT
        || invoice.status === InvoiceStatus.CANCELLED
        || invoice.balanceDueCents <= 0
    ) {
        return res.status(409).json({ message: 'Для этого документа нельзя создать ссылку на оплату' });
    }

    const link = await ensureInvoicePaymentLink(invoice);
    if (!link) return res.status(409).json({ message: 'Для этого документа нельзя создать ссылку на оплату' });

    if (!link.reused) {
        await prisma.invoiceAuditLog.create({
            data: {
                invoiceId,
                action: 'MOLLIE_PAYMENT_LINK_CREATED',
                actorId: getActorId(req),
                newValues: {
                    molliePaymentLinkId: link.mollieId,
                    amountCents: invoice.balanceDueCents,
                    paymentUrl: link.paymentUrl,
                    expiresAt: link.expiresAt?.toISOString() ?? null,
                },
            },
        });
    }
    return res.status(link.reused ? 200 : 201).json({
        paymentId: link.mollieId,
        checkoutUrl: link.paymentUrl,
        status: link.archived ? 'archived' : 'open',
        expiresAt: link.expiresAt,
        reused: link.reused,
    });
};

const ensureInvoicePaymentUrl = async (invoice: {
    id: number;
    number: string;
    documentType: InvoiceDocumentType;
    status: InvoiceStatus;
    balanceDueCents: number;
    dueDate: Date | null;
    showPaymentButton: boolean;
    showPaymentQr: boolean;
}) => {
    const link = await ensureInvoicePaymentLink(invoice);
    return link?.paymentUrl ?? null;
};

const ensurePublicInvoicePaymentUrl = async (
    deliveryId: number,
    invoice: Parameters<typeof ensureInvoicePaymentUrl>[0],
) => {
    if (invoice.balanceDueCents <= 0 || (!invoice.showPaymentButton && !invoice.showPaymentQr)) {
        return null;
    }

    const paymentUrl = await ensureInvoicePaymentUrl(invoice);
    if (paymentUrl) {
        await prisma.invoiceDelivery.update({
            where: { id: deliveryId },
            data: { paymentUrl },
        });
    }
    return paymentUrl;
};

export const sendInvoice = async (req: Request, res: Response) => {
    const invoiceId = Number(req.params.id);
    const parsed = z.object({ resend: z.boolean().optional() }).safeParse(req.body ?? {});
    if (!invoiceId || !parsed.success) return res.status(400).json({ message: 'Некорректные данные отправки' });

    try {
        const delivery = await sendInvoiceEmail({
            invoiceId,
            type: parsed.data.resend ? InvoiceDeliveryType.RESEND : InvoiceDeliveryType.INITIAL,
            actorId: getActorId(req),
        });
        return res.status(201).json(delivery);
    } catch (error) {
        console.error('Invoice email failed:', error);
        return res.status(503).json({ message: error instanceof Error ? error.message : 'Не удалось отправить инвойс' });
    }
};

export const getInvoiceDeliveries = async (req: Request, res: Response) => {
    const invoiceId = Number(req.params.id);
    if (!invoiceId) return res.status(400).json({ message: 'Некорректный инвойс' });
    const deliveries = await prisma.invoiceDelivery.findMany({
        where: { invoiceId },
        select: {
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
            createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    return res.json(deliveries);
};

const getPublicInvoice = async (token: string) => prisma.invoiceDelivery.findUnique({
    where: { publicToken: token },
    include: {
        invoice: {
            include: {
                items: { orderBy: { id: 'asc' } },
                molliePayments: {
                    where: { checkoutUrl: { not: null }, status: { in: ['open', 'pending'] } },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        },
    },
});

const escapeHtml = (value: unknown) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const viewPublicInvoice = async (req: Request, res: Response) => {
    const delivery = await getPublicInvoice(req.params.token);
    if (!delivery) return res.status(404).send('Invoice not found');
    await prisma.invoiceDelivery.update({
        where: { id: delivery.id },
        data: {
            firstViewedAt: delivery.firstViewedAt ?? new Date(),
            lastViewedAt: new Date(),
            viewCount: { increment: 1 },
        },
    });
    const invoice = delivery.invoice;
    let paymentUrl: string | null = null;
    try {
        paymentUrl = await ensurePublicInvoicePaymentUrl(delivery.id, invoice);
    } catch (error) {
        console.error(`Unable to create Mollie payment link for public invoice ${invoice.number}:`, error);
    }
    const items = invoice.items.map((item) => `
        <tr><td>${escapeHtml(item.description)}</td><td>${item.quantity}</td><td>€${(item.totalCents / 100).toFixed(2)}</td></tr>
    `).join('');
    return res.type('html').send(`<!doctype html>
        <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
        <title>${escapeHtml(invoice.number)}</title>
        <style>body{font-family:Arial,sans-serif;background:#f5f6f8;color:#1d1d33;margin:0;padding:32px}.card{max-width:760px;margin:auto;background:#fff;padding:32px;border-radius:16px}table{width:100%;border-collapse:collapse}td{padding:12px;border-bottom:1px solid #eee}.bank{margin-top:24px;padding:18px;background:#f5f6f8;border-radius:10px}.bank p{margin:7px 0}.ref{font-size:18px;font-weight:bold}.hint{color:#6b7280;font-size:13px}.actions{display:flex;gap:12px;margin-top:24px}.btn{padding:12px 18px;border-radius:8px;background:#1d1d33;color:#fff;text-decoration:none}.pay{background:#b5d63d;color:#1d1d33}</style>
        </head><body><main class="card"><h1>${escapeHtml(invoice.number)}</h1><p>${escapeHtml(invoice.billToName)}</p>
        <table>${items}</table><h2>Balance due: €${(invoice.balanceDueCents / 100).toFixed(2)}</h2>
        ${invoice.balanceDueCents > 0 && invoice.iban && invoice.paymentReference ? `<section class="bank"><strong>Pay by bank transfer</strong><p>IBAN: ${escapeHtml(invoice.iban)}</p><p>Reference: <span class="ref">${escapeHtml(invoice.paymentReference)}</span></p><p class="hint">Always include this reference so we can match your payment to this invoice.</p></section>` : ''}
        <div class="actions"><a class="btn" href="/api/v1/invoices/public/${delivery.publicToken}/pdf">Download PDF</a>
        ${invoice.showPaymentButton && paymentUrl && invoice.balanceDueCents > 0 ? `<a class="btn pay" href="${escapeHtml(paymentUrl)}">Pay with Mollie</a>` : ''}</div></main></body></html>`);
};

export const downloadPublicInvoicePdf = async (req: Request, res: Response) => {
    const delivery = await getPublicInvoice(req.params.token);
    if (!delivery) return res.status(404).send('Invoice not found');
    const invoice = delivery.invoice;
    let paymentUrl: string | null = null;
    try {
        paymentUrl = await ensurePublicInvoicePaymentUrl(delivery.id, invoice);
    } catch (error) {
        console.error(`Unable to create Mollie payment link for public PDF ${invoice.number}:`, error);
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.number}.pdf"`);
    const document = await createInvoicePdf({
        ...invoice,
        paymentUrl,
    });
    document.pipe(res);
    document.end();
};

export const downloadInvoicePdf = async (req: Request, res: Response) => {
    const invoice = await prisma.invoice.findUnique({
        where: { id: Number(req.params.id) },
        include: {
            items: { orderBy: { id: 'asc' } },
            molliePayments: {
                where: { checkoutUrl: { not: null }, status: { in: ['open', 'pending'] } },
                orderBy: { createdAt: 'desc' },
                take: 1,
            },
        },
    });
    if (!invoice) return res.status(404).json({ message: 'Инвойс не найден' });
    let paymentUrl: string | null = null;
    if (!paymentUrl && invoice.balanceDueCents > 0 && (invoice.showPaymentButton || invoice.showPaymentQr)) {
        try {
            paymentUrl = await ensureInvoicePaymentUrl(invoice);
        } catch (error) {
            console.error(`Unable to create Mollie payment link for PDF ${invoice.number}:`, error);
        }
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.number}.pdf"`);
    const document = await createInvoicePdf({
        ...invoice,
        paymentUrl,
    });
    document.pipe(res);
    document.end();
};
