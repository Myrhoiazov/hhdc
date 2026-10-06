import { Client as TClient, Prisma } from '@prisma/client';
import prisma from '../../../prisma/prisma-client'
import { notifyNewStudent, notifyStudentDeleted, type NewStudentSource } from '../communication';

const Client = prisma.client
const paymentIssueStatuses = ['failed', 'canceled', 'charged_back', 'chargeback'];

const paymentStatusWhere: Record<ClientPaymentStatusFilter, Prisma.ClientWhereInput> = {
    all: {},
    linked: {
        mollieLinks: { some: {} },
    },
    unlinked: {
        mollieLinks: { none: {} },
    },
    active_subscription: {
        mollieLinks: {
            some: {
                customer: {
                    subscriptions: {
                        some: { status: 'active' },
                    },
                },
            },
        },
    },
    paid: {
        mollieLinks: {
            some: {
                customer: {
                    payments: {
                        some: { status: 'paid' },
                    },
                },
            },
        },
    },
    payment_issue: {
        mollieLinks: {
            some: {
                customer: {
                    payments: {
                        some: { status: { in: paymentIssueStatuses } },
                    },
                },
            },
        },
    },
};

export type ClientPaymentStatusFilter =
    | 'all'
    | 'linked'
    | 'unlinked'
    | 'active_subscription'
    | 'paid'
    | 'payment_issue';

export interface IClientAttributes {
    id: number;
    firstName?: string;
    lastName?: string;
    birthday?: string;
    phoneNumber?: string;
    email?: string;
    branchId?: number | null;
    image_3d?: boolean;
    document?: boolean;
    anamnesis?: string;
    description?: string;
    image?: string;
}

export interface GetClientsParams {
    _sortBy?: 'firstName' | 'createdAt';
    _order?: 'asc' | 'desc';
    _q?: string,
    _branchId?: string;
    _paymentStatus?: ClientPaymentStatusFilter;
}

export interface CreateClientOptions {
    mollieCustomerId?: number | null;
    payerRelation?: string;
    groupIds?: number[];
    // Who created the student and from where — only used for the Telegram notification.
    createdByEmail?: string | null;
    source?: NewStudentSource;
}

export const normalizeClientData = (data: Partial<TClient> & { status?: unknown }) => {
    delete data.id;
    delete data.status;
    delete data.createdAt;
    delete data.expiresAt;
    delete data.image_3d;
    delete data.document;
    delete data.anamnesis;
    delete data.description;

    if ('branchId' in data) {
        const branchId = Number(data.branchId);
        data.branchId = Number.isFinite(branchId) && branchId > 0 ? branchId : null;
    }

    for (const field of ['firstName', 'lastName', 'birthday', 'phoneNumber', 'email', 'social'] as const) {
        if (field in data) {
            const value = data[field];
            data[field] = typeof value === 'string' && value.trim() ? value.trim() : null;
        }
    }

    return data;
}

// Shared by createClient/getClientById/updateClient — matches client/src/entities/Client/model/
// types/client.ts's ClientBranch/ClientDanceGroup exactly; `branch: true`/`group: true` would
// otherwise leak Branch.phone/email/description/timestamps and DanceGroup.maxParticipants/
// lessonPriceCents/choreographerId (internal FK)/hallId/timestamps. See
// docs/spec/DDC_CRM_API_RESPONSE_SHAPE_SPEC.md.
const clientDetailInclude = {
    branch: { select: { id: true, name: true, city: true, address: true, isActive: true } },
    groupMemberships: {
        select: {
            groupId: true,
            group: { select: { id: true, name: true, style: true, level: true, branchId: true } },
        },
    },
} satisfies Prisma.ClientInclude;

type TransactionClient = Prisma.TransactionClient;

const assertCustomerExists = async (transaction: TransactionClient, mollieCustomerId: number) => {
    const customer = await transaction.customer.findUnique({
        where: { id: mollieCustomerId },
    });

    if (!customer) {
        throw new Error('MOLLIE_CUSTOMER_NOT_FOUND');
    }
    return customer;
};

const upsertCustomerClientLink = async (
    transaction: TransactionClient,
    customer: Awaited<ReturnType<typeof assertCustomerExists>>,
    clientId: number,
    relation: string,
) => {
    const existingLinksCount = await transaction.customerClientLink.count({
        where: { customerId: customer.id },
    });
    const isPrimary = existingLinksCount === 0;

    await transaction.customerClientLink.upsert({
        where: {
            customerId_clientId: {
                customerId: customer.id,
                clientId,
            },
        },
        update: {
            payerRelation: relation,
            linkSource: 'manual',
            isPrimary,
        },
        create: {
            customerId: customer.id,
            clientId,
            payerRelation: relation,
            linkSource: 'manual',
            isPrimary,
        },
    });

    if (!customer.clientId) {
        await transaction.customer.update({
            where: { id: customer.id },
            data: {
                clientId,
                payerRelation: relation,
                linkSource: 'manual',
            },
        });
    }
};

const linkMollieCustomer = async (
    transaction: TransactionClient,
    clientId: number,
    mollieCustomerId: number,
    payerRelation?: string,
) => {
    const customer = await assertCustomerExists(transaction, mollieCustomerId);
    const relation = payerRelation || 'unknown';

    await upsertCustomerClientLink(transaction, customer, clientId, relation);
};

// Fire-and-forget, after the transaction has committed: a Telegram failure must not fail or
// roll back the creation. Lives here (not in a controller) so no creation path can skip it.
const announceNewStudent = (
    client: { id: number; firstName?: string | null; lastName?: string | null; branch?: { name: string } | null },
    options: CreateClientOptions,
) => {
    void notifyNewStudent({
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        branchName: client.branch?.name,
        createdByEmail: options.createdByEmail,
        source: options.source ?? 'CRM',
    }).catch((error) => console.error('Failed to send new-student Telegram notification:', error));
};

export const createClient = async (data: TClient, options: CreateClientOptions = {}) => {
    const clientData = normalizeClientData(data as Partial<TClient> & { status?: unknown });

    const createdClient = await prisma.$transaction(async (transaction) => {
        const newClient = await transaction.client.create({
            data: {
                ...clientData,
                groupMemberships: options.groupIds?.length ? {
                    create: options.groupIds.map((groupId) => ({ groupId })),
                } : undefined,
            },
            include: clientDetailInclude,
        });

        if (options.mollieCustomerId) {
            await linkMollieCustomer(transaction, newClient.id, options.mollieCustomerId, options.payerRelation);
        }

        return newClient;
    });
    announceNewStudent(createdClient, options);

    return createdClient;
};

// List view of clients (getAllClients) — narrower than the include shared by
// create/update/getClientById: the list cards (ClientListItemBig/Small, ClientsPage's branch
// filter) only ever read branch.name, and never read groupMemberships at all (that's only
// used by ClientDetails.tsx, which is fed by the separate getClientById detail fetch).
// See docs/spec/DDC_CRM_API_RESPONSE_SHAPE_SPEC.md.
const clientListInclude = {
    branch: { select: { id: true, name: true } },
    mollieLinks: {
        orderBy: [
            { isPrimary: 'desc' as const },
            { createdAt: 'asc' as const },
        ],
        take: 1,
        select: {
            customerId: true,
            isPrimary: true,
        },
    },
};

// Nothing currently exposes a bare student count — getAllClients returns the full array with no
// pagination/count metadata. Used by the Telegram admin bot's dashboard flow (tasks/plan.md).
export const getClientCount = () => prisma.client.count();

export const getAllClients = async (params: GetClientsParams) => {

    const {
        _sortBy = 'createdAt',
        _order = 'desc',
        _q,
        _branchId,
        _paymentStatus = 'all',
    } = params;
    const branchId = _branchId ? Number(_branchId) : null;

    const whereClause: Prisma.ClientWhereInput = {
        ...(!!_q && {
            OR: [
                { firstName: { contains: _q } },
                { lastName: { contains: _q } },
                { email: { contains: _q } },
                { phoneNumber: { contains: _q } },
            ],
        }),
        ...(!!branchId && {
            branchId,
        }),
        ...(paymentStatusWhere[_paymentStatus] || {}),
    }

    const clients = await Client.findMany({
        where: whereClause,
        orderBy: {
            [_sortBy]: _order,
        },
        include: clientListInclude,
    });

    return clients;
};

export const getClientById = async (id: number) => {
    const client = await Client.findUnique({
        where: { id },
        include: clientDetailInclude,
    });

    if (!client) return null;

    return client;
};

export const updateClient = async (id: number, data: Partial<TClient>, groupIds?: number[]) => {
    const clientData = normalizeClientData(data);

    return prisma.$transaction(async (transaction) => {
        if (groupIds) {
            await transaction.clientDanceGroup.deleteMany({ where: { clientId: id } });
        }
        return transaction.client.update({
            where: { id },
            data: {
                ...clientData,
                groupMemberships: groupIds?.length ? {
                    create: groupIds.map((groupId) => ({ groupId })),
                } : undefined,
            },
            include: clientDetailInclude,
        });
    });
};

export interface DeleteClientOptions {
    deletedByEmail?: string;
}

// Fire-and-forget, after the row is gone: a Telegram failure must not fail the deletion.
const announceStudentDeleted = (
    client: { firstName?: string | null; lastName?: string | null; branch?: { name: string } | null },
    options: DeleteClientOptions,
) => {
    void notifyStudentDeleted({
        firstName: client.firstName,
        lastName: client.lastName,
        branchName: client.branch?.name,
        deletedByEmail: options.deletedByEmail,
    }).catch((error) => console.error('Failed to send student-deleted Telegram notification:', error));
};

export const deleteClient = async (id: number, options: DeleteClientOptions = {}) => {
    const deletedClient = await Client.delete({
        where: { id },
        // Response body is trimmed to a message by the controller; the name and branch only
        // feed the Telegram notification.
        select: { id: true, firstName: true, lastName: true, branch: { select: { name: true } } },
    });
    announceStudentDeleted(deletedClient, options);

    return deletedClient;
};
