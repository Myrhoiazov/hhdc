import { Request, Response } from 'express';
import { getClientCount, createClient, deleteClient, getAllClients, getClientById, updateClient } from './clients.service';
import { Client, Prisma } from '@prisma/client';
import { imageUpload } from '../../common/utils/file-upload';
import prisma from '../../../prisma/prisma-client';
import { z } from 'zod';
import { AuthSecurityEventType } from '@prisma/client';
import { recordAuthSecurityEvent } from '../auth/auth.security-audit.service';

const optionalText = z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().trim().optional(),
);

const optionalEmail = z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().trim().email('Некорректный email').max(254, 'Email слишком длинный').optional(),
);

const optionalLimitedText = (max: number, message: string) => z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().trim().max(max, message).optional(),
);

const optionalPhone = z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string()
        .trim()
        .max(32, 'Телефон слишком длинный')
        .refine((value) => value.replace(/\D/g, '').length >= 7, 'Телефон слишком короткий')
        .optional(),
);

const groupIdsValue = z.preprocess(
    (value) => {
        if (typeof value !== 'string') return value;
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    },
    z.array(z.coerce.number().int().positive()).max(50),
);
const groupIds = groupIdsValue.default([]);

const createClientSchema = z.object({
    firstName: optionalText,
    lastName: optionalText,
    birthday: z.preprocess(
        (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
        z.string().date().optional(),
    ),
    phoneNumber: optionalText,
    email: optionalEmail,
    social: optionalText,
    branchId: z.preprocess(
        (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
        z.coerce.number().int().positive().optional(),
    ),
    mollieCustomerId: z.preprocess(
        (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
        z.coerce.number().int().positive().optional(),
    ),
    payerRelation: z.enum(['self', 'parent', 'guardian', 'unknown']).optional(),
    preferredLanguage: z.enum(['EN', 'NL', 'RU']).optional(),
    groupIds,
}).refine((data) => Boolean(data.firstName || data.lastName), {
    message: 'Укажите имя или фамилию ученика',
    path: ['firstName'],
}).refine((data) => !data.birthday || new Date(data.birthday) <= new Date(), {
    message: 'Дата рождения не может быть в будущем',
    path: ['birthday'],
});

const updateClientSchema = z.object({
    firstName: optionalLimitedText(100, 'Имя слишком длинное'),
    lastName: optionalLimitedText(100, 'Фамилия слишком длинная'),
    birthday: z.preprocess(
        (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
        z.string().date().optional(),
    ),
    phoneNumber: optionalPhone,
    email: optionalEmail,
    social: optionalLimitedText(255, 'Ссылка на социальную сеть слишком длинная'),
    branchId: z.preprocess(
        (value) => typeof value === 'string' && value.trim() === '' ? null : value,
        z.coerce.number().int().positive().nullable().optional(),
    ),
    groupIds: groupIdsValue.optional(),
    preferredLanguage: z.enum(['EN', 'NL', 'RU']).optional(),
}).strict().refine((data) => Boolean(data.firstName || data.lastName), {
    message: 'Укажите имя или фамилию ученика',
    path: ['firstName'],
}).refine((data) => !data.birthday || new Date(data.birthday) <= new Date(), {
    message: 'Дата рождения не может быть в будущем',
    path: ['birthday'],
});

const validateGroupSelection = async (branchId: number | null | undefined, selectedGroupIds: number[] = []) => {
    if (!selectedGroupIds.length) return true;
    if (!branchId) return false;
    const matchingGroups = await prisma.danceGroup.count({
        where: { id: { in: selectedGroupIds }, branchId },
    });
    return matchingGroups === new Set(selectedGroupIds).size;
};

const customerBasicSelect = {
    id: true,
    mollieId: true,
    email: true,
    payerName: true,
    givenName: true,
    familyName: true,
} satisfies Prisma.CustomerSelect;

const customerPayerSelect = {
    ...customerBasicSelect,
    payerRelation: true,
    linkSource: true,
} satisfies Prisma.CustomerSelect;

const findPayerLinks = async (clientId: number) => prisma.customerClientLink.findMany({
    where: { clientId },
    include: {
        customer: { select: customerPayerSelect },
    },
    orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
    ],
});

// Matches client/src/pages/ClientsDetailsPage/ui/ClientPaymentBlock/types.ts's ClientPayment —
// omits refundedAmount/chargedBackAmount/adjustmentAt/invoiceId/subscriptionId (internal FK).
// See docs/spec/DDC_CRM_API_RESPONSE_SHAPE_SPEC.md.
const clientPaymentSelect = {
    id: true,
    mollieId: true,
    amountValue: true,
    amountCurrency: true,
    description: true,
    method: true,
    status: true,
    checkoutUrl: true,
    isCancelable: true,
    paidAt: true,
    createdAt: true,
    updatedAt: true,
} satisfies Prisma.PaymentSelect;

const findLatestPayments = async (clientId: number) => prisma.payment.findMany({
    where: {
        customer: {
            clientLinks: {
                some: { clientId },
            },
        },
    },
    select: {
        ...clientPaymentSelect,
        customer: { select: customerBasicSelect },
        subscription: {
            select: {
                id: true,
                mollieId: true,
                status: true,
                description: true,
            },
        },
    },
    orderBy: { createdAt: 'desc' },
    take: 8,
});

const findPaymentLinks = async (clientId: number) => prisma.payment.findMany({
    where: {
        checkoutUrl: { not: null },
        customer: {
            clientLinks: {
                some: { clientId },
            },
        },
    },
    select: {
        ...clientPaymentSelect,
        customer: { select: customerBasicSelect },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
});

// Matches client/src/pages/ClientsDetailsPage/ui/ClientPaymentBlock/types.ts's
// ClientSubscription — omits metadata/mandateId/customerId (internal FK); mandate is narrowed to
// the 2 fields ClientSubscription.mandate reads instead of the full Mandate model.
// See docs/spec/DDC_CRM_API_RESPONSE_SHAPE_SPEC.md.
const findSubscriptions = async (clientId: number) => prisma.subscription.findMany({
    where: {
        customer: {
            clientLinks: {
                some: { clientId },
            },
        },
    },
    select: {
        id: true,
        mollieId: true,
        description: true,
        amountValue: true,
        amountCurrency: true,
        interval: true,
        status: true,
        startDate: true,
        nextPaymentDate: true,
        times: true,
        createdAt: true,
        updatedAt: true,
        mandate: { select: { mollieId: true, status: true } },
        customer: { select: customerBasicSelect },
    },
    orderBy: { updatedAt: 'desc' },
});

// Matches client/src/pages/ClientsDetailsPage/ui/ClientPaymentBlock/types.ts's ClientMandate —
// omits mandateReference/customerId (internal FK). See
// docs/spec/DDC_CRM_API_RESPONSE_SHAPE_SPEC.md.
const findMandates = async (clientId: number) => prisma.mandate.findMany({
    where: {
        customer: {
            clientLinks: {
                some: { clientId },
            },
        },
    },
    select: {
        id: true,
        mollieId: true,
        status: true,
        method: true,
        signatureDate: true,
        createdAt: true,
        updatedAt: true,
        customer: { select: customerBasicSelect },
    },
    orderBy: { updatedAt: 'desc' },
});

export const fetchAllClientsController = async (req: Request, res: Response) => {

    const clients = await getAllClients(req.query)
    try {
        return res.status(200).json([...clients]);
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export const createClientsController = async (req: Request, res: Response) => {
    const parsedBody = createClientSchema.safeParse(req.body);

    if (!parsedBody.success) {
        return res.status(400).json({
            message: 'Проверьте данные ученика',
            details: parsedBody.error.flatten(),
        });
    }

    try {
        const { mollieCustomerId, payerRelation, groupIds: rawGroupIds, ...clientData } = parsedBody.data;
        const selectedGroupIds = Array.from(new Set(rawGroupIds));
        if (!await validateGroupSelection(clientData.branchId, selectedGroupIds)) {
            return res.status(400).json({ message: 'Выбранные группы должны принадлежать филиалу ученика' });
        }
        const image = req.file ? await imageUpload(req.file, 'clients') : null;
        const client = await createClient({
            ...clientData,
            image,
        } as Client, {
            mollieCustomerId,
            payerRelation,
            groupIds: selectedGroupIds,
            createdByEmail: req.user?.email,
            source: req.authMethod === 'telegram-miniapp' ? 'TELEGRAM_MINIAPP' : 'CRM',
        });

        if (req.authMethod === 'telegram-miniapp') {
            await recordAuthSecurityEvent({
                type: AuthSecurityEventType.TELEGRAM_MINIAPP_STUDENT_CREATED,
                actorUserId: req.user?.id,
                metadata: { clientId: client.id },
                req,
            });
        }

        return res.status(200).json(client);
    } catch (error) {
        if (error instanceof Error && error.message === 'MOLLIE_CUSTOMER_NOT_FOUND') {
            return res.status(404).json({ message: 'Выбранный платёжный аккаунт не найден' });
        }

        console.error('Error creating client:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export const getClientByIdController = async (req: Request, res: Response) => {
    const clientId = Number(req.params.id);

    if (!clientId) {
        return res.status(400).json({ message: 'Client ID is required' });
    }

    try {
        const Client = await getClientById(clientId);
        if (!Client) {
            return res.status(404).json({ message: 'Client not found' });
        }
        return res.status(200).json(Client);
    } catch (error) {
        console.error('Error deleting Client:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }

}

export const updateClientByIdController = async (req: Request<{ id: string }, {}, Client>, res: Response) => {
    const clientId = Number(req.params.id);

    if (!clientId) {
        return res.status(400).json({ message: 'Client ID is required' });
    }

    const parsedBody = updateClientSchema.safeParse(req.body);

    if (!parsedBody.success) {
        return res.status(400).json({
            message: 'Проверьте данные ученика',
            details: parsedBody.error.flatten(),
        });
    }

    const { groupIds: rawGroupIds, ...parsedClientData } = parsedBody.data;
    const selectedGroupIds = rawGroupIds ? Array.from(new Set(rawGroupIds)) : undefined;
    // Not a secret: Skylos reads the long identifiers on this line as a high-entropy value.
    if (selectedGroupIds && !await validateGroupSelection(parsedClientData.branchId, selectedGroupIds)) { // skylos: ignore[SKY-S101]
        return res.status(400).json({ message: 'Выбранные группы должны принадлежать филиалу ученика' });
    }
    const clientData = { ...parsedClientData } as Partial<Client>;

    if (req.file) {
        const filePath = await imageUpload(req.file, 'clients')
        clientData.image = filePath
    }

    try {
        const updatedClient = await updateClient(clientId, clientData, selectedGroupIds);
        return res.status(200).json(updatedClient);
    } catch (error) {
        console.error('Error updating client:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

const buildPaymentSummaryPayload = async (clientId: number) => {
    const [payerLinks, latestPayments, paymentLinks, subscriptions, mandates] = await Promise.all([
        findPayerLinks(clientId),
        findLatestPayments(clientId),
        findPaymentLinks(clientId),
        findSubscriptions(clientId),
        findMandates(clientId),
    ]);

    const issueStatuses = ['failed', 'canceled', 'expired', 'charged_back'];
    const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === 'active');
    const lastPayment = latestPayments[0] ?? null;
    const latestIssue = latestPayments.find((payment) => issueStatuses.includes(payment.status)) ?? null;

    return {
        payers: payerLinks.map((link) => ({
            id: link.id,
            payerRelation: link.payerRelation,
            linkSource: link.linkSource,
            isPrimary: link.isPrimary,
            customer: link.customer,
        })),
        latestPayments,
        paymentLinks,
        subscriptions,
        activeSubscriptions,
        mandates,
        summary: {
            payerCount: payerLinks.length,
            activeSubscriptionCount: activeSubscriptions.length,
            lastPayment,
            latestIssue,
            paymentStatus: latestIssue ? 'issue' : activeSubscriptions.length ? 'active' : 'unknown',
        },
    };
};

export const getClientPaymentSummaryController = async (req: Request, res: Response) => {
    const clientId = Number(req.params.id);

    if (!clientId) {
        return res.status(400).json({ message: 'Client ID is required' });
    }

    try {
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { id: true },
        });

        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        return res.status(200).json(await buildPaymentSummaryPayload(clientId));
    } catch (error) {
        console.error('Error fetching client payment summary:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export const deleteClientByIdController = async (req: Request, res: Response) => {
    const clientId = Number(req.params.id);

    if (!clientId) {
        return res.status(400).json({ message: 'Client ID is required' });
    }

    try {
        const deletedClient = await deleteClient(clientId, { deletedByEmail: req.user?.email });

        if (!deletedClient) {
            return res.status(404).json({ message: 'Client not found or already deleted' });
        }

        // Client callers (EditClientDropdown) only check the request status, never
        // the body — no reason to echo the full deleted row.
        return res.status(200).json({ message: 'Client successfully deleted' });
    } catch (error) {
        console.error('Error deleting client:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getClientCountController = async (_req: Request, res: Response) => {
    return res.status(200).json({ count: await getClientCount() });
};
