import prisma from '../../../prisma/prisma-client';
import { Prisma } from '@prisma/client';
import { Request } from 'express';
import { z } from 'zod';
import { emitHistoryEvent } from '../outbox/outbox.service';

export interface AuditLogInput {
    actorUserId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    before?: unknown;
    after?: unknown;
}

export const extractAuditContext = (req: Request) => ({
    actorUserId: req.res?.locals?.user?.id as string | undefined,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
});

export const createAuditLog = async (
    input: AuditLogInput,
    context?: { ipAddress?: string; userAgent?: string; actorUserId?: string },
    tx?: Prisma.TransactionClient
) => {
    const data = {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        actorUserId: input.actorUserId ?? context?.actorUserId,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        before: input.before ? (input.before as Prisma.InputJsonValue) : Prisma.JsonNull,
        after: input.after ? (input.after as Prisma.InputJsonValue) : Prisma.JsonNull,
    };

    if (tx) {
        return tx.auditLog.create({ data });
    }
    return prisma.auditLog.create({ data });
};

// Backwards compatibility for existing CRM modules
export const auditData = (req: Request, action: string, entityType: string, entityId: string) => ({
    action,
    entityType,
    entityId,
    actorUserId: req.res?.locals?.user?.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
});

export const recordHistory = async (tx: Prisma.TransactionClient, req: Request, input: {
    type: string; entityType: string; entityId: string; personId?: string; eventId?: string;
}) => {
    await tx.activity.create({ 
        data: { 
            ...input, 
            actorUserId: req.res?.locals?.user?.id, 
            metadata: {} 
        } 
    });
    await tx.auditLog.create({ 
        data: auditData(req, input.type, input.entityType, input.entityId) 
    });
    await emitHistoryEvent(tx, input);
};

// Filters of the audit page. Paging fields travel in the same query and are read separately;
// an empty value means "no filter".
const blankAsMissing = (value: unknown) => (value === '' ? undefined : value);
const day = z.preprocess(blankAsMissing, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());
export const auditFiltersSchema = z.object({
    q: z.preprocess(blankAsMissing, z.string().trim().max(100).optional()),
    entityType: z.preprocess(blankAsMissing, z.string().trim().max(100).optional()),
    actorUserId: z.preprocess(blankAsMissing, z.string().uuid().optional()),
    from: day,
    to: day,
});
export type AuditFilters = z.infer<typeof auditFiltersSchema>;

const DAY_MS = 86_400_000;

// Actions are stored in capitals with underscores, so "payment confirmed" finds PAYMENT_CONFIRMED.
// The period includes both of its days.
export const auditWhere = (filters: AuditFilters): Prisma.AuditLogWhereInput => {
    const query = filters.q?.trim().replace(/\s+/g, '_');
    const period = {
        ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00.000Z`) } : {}),
        ...(filters.to ? { lt: new Date(new Date(`${filters.to}T00:00:00.000Z`).getTime() + DAY_MS) } : {}),
    };
    return {
        ...(query ? { action: { contains: query, mode: 'insensitive' } } : {}),
        ...(filters.entityType ? { entityType: filters.entityType } : {}),
        ...(filters.actorUserId ? { actorUserId: filters.actorUserId } : {}),
        ...(Object.keys(period).length ? { createdAt: period } : {}),
    };
};

const ENTRY_FIELDS = { id: true, actorUserId: true, action: true, entityType: true, entityId: true, ipAddress: true, createdAt: true } as const;

const loadActors = async (ids: string[]) => {
    const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } }) : [];
    return new Map(users.map(user => [user.id, user]));
};

// Newest first, each entry with the staff member behind it. What was changed (before/after) is
// kept in the log and not sent with the list.
export const listAuditEntries = async (filters: AuditFilters, paging: { skip: number; take: number }) => {
    const where = auditWhere(filters);
    const [rows, total] = await prisma.$transaction([
        prisma.auditLog.findMany({ where, ...paging, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], select: ENTRY_FIELDS }),
        prisma.auditLog.count({ where }),
    ]);
    const actors = await loadActors([...new Set(rows.flatMap(row => (row.actorUserId ? [row.actorUserId] : [])))]);
    return { data: rows.map(row => ({ ...row, actor: row.actorUserId ? actors.get(row.actorUserId) ?? null : null })), total };
};

// What the filters can offer: the kinds of records that appear in the log and the people who acted.
export const listAuditOptions = async () => {
    const [types, actorIds] = await Promise.all([
        prisma.auditLog.findMany({ distinct: ['entityType'], select: { entityType: true }, orderBy: { entityType: 'asc' } }),
        prisma.auditLog.findMany({ distinct: ['actorUserId'], select: { actorUserId: true }, where: { actorUserId: { not: null } } }),
    ]);
    const actors = await loadActors(actorIds.map(row => row.actorUserId as string));
    return { entityTypes: types.map(row => row.entityType), actors: [...actors.values()].sort((a, b) => a.name.localeCompare(b.name)) };
};
