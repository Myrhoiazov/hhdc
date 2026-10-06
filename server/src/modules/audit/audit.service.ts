import prisma from '../../../prisma/prisma-client';
import { Prisma } from '@prisma/client';
import { Request } from 'express';

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
};
