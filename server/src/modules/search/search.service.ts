import { Prisma, UserRole } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';

const RESULT_LIMIT = 5;
const FETCH_POOL = 25;

export interface SearchClientHit {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phoneNumber: string | null;
    branchName: string | null;
}

export interface SearchPaymentHit {
    id: number;
    mollieId: string | null;
    description: string | null;
    amountValue: string;
    amountCurrency: string;
    status: string;
    createdAt: string;
    customerId: number;
    customerName: string | null;
}

export interface SearchGroupHit {
    id: number;
    name: string;
    style: string;
    level: string;
    branchId: number | null;
    branchName: string | null;
}

export interface SearchChoreographerHit {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
}

export interface SearchBranchHit {
    id: number;
    name: string;
    city: string | null;
    address: string | null;
}

export interface SearchTransactionHit {
    id: number;
    description: string | null;
    amount: number;
    type: string;
    category: string;
    date: string;
}

export interface GlobalSearchResponse {
    query: string;
    clients: { total: number; items: SearchClientHit[] };
    payments: { total: number; items: SearchPaymentHit[] };
    groups: { total: number; items: SearchGroupHit[] };
    choreographers: { total: number; items: SearchChoreographerHit[] };
    branches: { total: number; items: SearchBranchHit[] };
    transactions?: { total: number; items: SearchTransactionHit[] };
}

export interface SearchAllOptions {
    role: UserRole;
}

// Транзакции — финансовые данные, скрытые от не-ADMIN даже в сайдбаре (см.
// GLOBAL_SEARCH_SPEC.md, п.7). Вынесено в отдельную чистую функцию, чтобы правило
// доступа было юнит-тестируемо без обращения к БД.
export const shouldIncludeTransactions = (role: UserRole): boolean => role === UserRole.ADMIN;

// Точное совпадение (без учёта регистра) ранжируется выше startsWith, который выше
// произвольного contains. Ранжирование считается по пулу из FETCH_POOL строк,
// полученных из БД в дефолтном порядке — этого достаточно для MVP без построения
// полнотекстового индекса (см. GLOBAL_SEARCH_SPEC.md, "Открытые вопросы").
export const rankAndLimit = <T>(
    rows: T[],
    q: string,
    getFields: (row: T) => Array<string | null | undefined>,
    limit = RESULT_LIMIT,
): T[] => {
    const needle = q.trim().toLowerCase();

    const ranked = rows.map((row) => {
        const rank = getFields(row).reduce((best, field) => {
            if (!field) return best;
            const value = field.toLowerCase();
            if (value === needle) return Math.min(best, 0);
            if (value.startsWith(needle)) return Math.min(best, 1);
            if (value.includes(needle)) return Math.min(best, 2);
            return best;
        }, 3);

        return { row, rank };
    });

    ranked.sort((a, b) => a.rank - b.rank);

    return ranked.slice(0, limit).map((entry) => entry.row);
};

const searchClients = async (q: string): Promise<GlobalSearchResponse['clients']> => {
    const where: Prisma.ClientWhereInput = {
        OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { email: { contains: q } },
            { phoneNumber: { contains: q } },
        ],
    };

    const [rows, total] = await Promise.all([
        prisma.client.findMany({
            where,
            take: FETCH_POOL,
            orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
                branch: { select: { name: true } },
            },
        }),
        prisma.client.count({ where }),
    ]);

    const items = rankAndLimit(rows, q, (row) => [row.firstName, row.lastName, row.email, row.phoneNumber])
        .map((row) => ({
            id: row.id,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            phoneNumber: row.phoneNumber,
            branchName: row.branch?.name ?? null,
        }));

    return { total, items };
};

export const paymentCustomerName = (customer: {
    payerName: string | null;
    givenName: string | null;
    familyName: string | null;
    email: string | null;
} | null) => {
    if (!customer) return null;
    return customer.payerName
        || [customer.givenName, customer.familyName].filter(Boolean).join(' ').trim()
        || customer.email
        || null;
};

const paymentSearchWhere = (q: string): Prisma.PaymentWhereInput => ({
    // Платёж без customerId некуда открыть (нет отдельной detail-страницы платежа) —
    // такие записи исключаются из результатов поиска.
    customerId: { not: null },
    OR: [
        { mollieId: { contains: q } },
        { description: { contains: q } },
        { customer: { email: { contains: q } } },
        { customer: { givenName: { contains: q } } },
        { customer: { familyName: { contains: q } } },
        { customer: { payerName: { contains: q } } },
        { customer: { client: { firstName: { contains: q } } } },
        { customer: { client: { lastName: { contains: q } } } },
        { customer: { client: { email: { contains: q } } } },
        { customer: { clientLinks: { some: { client: { firstName: { contains: q } } } } } },
        { customer: { clientLinks: { some: { client: { lastName: { contains: q } } } } } },
        { customer: { clientLinks: { some: { client: { email: { contains: q } } } } } },
    ],
});

const queryPaymentRows = (q: string) => {
    const where = paymentSearchWhere(q);

    return Promise.all([
        prisma.payment.findMany({
            where,
            take: FETCH_POOL,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                mollieId: true,
                description: true,
                amountValue: true,
                amountCurrency: true,
                status: true,
                createdAt: true,
                customerId: true,
                customer: {
                    select: {
                        payerName: true,
                        givenName: true,
                        familyName: true,
                        email: true,
                    },
                },
            },
        }),
        prisma.payment.count({ where }),
    ]);
};

const searchPayments = async (q: string): Promise<GlobalSearchResponse['payments']> => {
    const [rows, total] = await queryPaymentRows(q);

    const items = rankAndLimit(rows, q, (row) => [
        row.mollieId,
        row.description,
        row.customer?.payerName,
        row.customer?.givenName,
        row.customer?.familyName,
        row.customer?.email,
    ]).map((row) => ({
        id: row.id,
        mollieId: row.mollieId,
        description: row.description,
        amountValue: row.amountValue.toString(),
        amountCurrency: row.amountCurrency,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        customerId: row.customerId as number,
        customerName: paymentCustomerName(row.customer),
    }));

    return { total, items };
};

const searchGroups = async (q: string): Promise<GlobalSearchResponse['groups']> => {
    const where: Prisma.DanceGroupWhereInput = {
        name: { contains: q },
    };

    const [rows, total] = await Promise.all([
        prisma.danceGroup.findMany({
            where,
            take: FETCH_POOL,
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                style: true,
                level: true,
                branchId: true,
                branch: { select: { name: true } },
            },
        }),
        prisma.danceGroup.count({ where }),
    ]);

    const items = rankAndLimit(rows, q, (row) => [row.name]).map((row) => ({
        id: row.id,
        name: row.name,
        style: row.style,
        level: row.level,
        branchId: row.branchId,
        branchName: row.branch?.name ?? null,
    }));

    return { total, items };
};

const searchChoreographers = async (q: string): Promise<GlobalSearchResponse['choreographers']> => {
    const where: Prisma.ChoreographerWhereInput = {
        OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
        ],
    };

    const [rows, total] = await Promise.all([
        prisma.choreographer.findMany({
            where,
            take: FETCH_POOL,
            orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
            },
        }),
        prisma.choreographer.count({ where }),
    ]);

    const items = rankAndLimit(rows, q, (row) => [row.firstName, row.lastName, row.email, row.phone]);

    return { total, items };
};

const searchBranches = async (q: string): Promise<GlobalSearchResponse['branches']> => {
    const where: Prisma.BranchWhereInput = {
        OR: [
            { name: { contains: q } },
            { city: { contains: q } },
            { address: { contains: q } },
        ],
    };

    const [rows, total] = await Promise.all([
        prisma.branch.findMany({
            where,
            take: FETCH_POOL,
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                city: true,
                address: true,
            },
        }),
        prisma.branch.count({ where }),
    ]);

    const items = rankAndLimit(rows, q, (row) => [row.name, row.city, row.address]);

    return { total, items };
};

const searchTransactions = async (q: string): Promise<GlobalSearchResponse['transactions']> => {
    const where: Prisma.TransactionWhereInput = {
        description: { contains: q },
    };

    const [rows, total] = await Promise.all([
        prisma.transaction.findMany({
            where,
            take: FETCH_POOL,
            orderBy: { date: 'desc' },
            select: {
                id: true,
                description: true,
                amount: true,
                type: true,
                category: true,
                date: true,
            },
        }),
        prisma.transaction.count({ where }),
    ]);

    const items = rankAndLimit(rows, q, (row) => [row.description]).map((row) => ({
        id: row.id,
        description: row.description,
        amount: row.amount,
        type: row.type,
        category: row.category,
        date: row.date.toISOString(),
    }));

    return { total, items };
};

export const searchAll = async (rawQuery: string, options: SearchAllOptions): Promise<GlobalSearchResponse> => {
    const q = rawQuery.trim();

    const [clients, payments, groups, choreographers, branches] = await Promise.all([
        searchClients(q),
        searchPayments(q),
        searchGroups(q),
        searchChoreographers(q),
        searchBranches(q),
    ]);

    const response: GlobalSearchResponse = { query: q, clients, payments, groups, choreographers, branches };

    // Категория "Транзакции" не запрашивается вовсе для не-ADMIN, а не просто
    // скрывается на фронте — это финансовые данные, доступные только ADMIN (см.
    // GLOBAL_SEARCH_SPEC.md, п.7).
    if (shouldIncludeTransactions(options.role)) {
        response.transactions = await searchTransactions(q);
    }

    return response;
};
