import { emitHistoryEvent } from '../outbox/outbox.service';
import { Prisma } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { Request } from 'express';

export interface LogActivityInput {
    personId?: string;
    eventId?: string;
    actorUserId?: string;
    type: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, any>;
}

/**
 * Service to record product history/activity for a person or event.
 */
export const activityService = {
    async logActivity(
        input: LogActivityInput,
        tx?: Prisma.TransactionClient
    ) {
        const data = {
            personId: input.personId,
            eventId: input.eventId,
            actorUserId: input.actorUserId,
            type: input.type,
            entityType: input.entityType,
            entityId: input.entityId,
            metadata: input.metadata || {},
        };

        if (tx) {
            return tx.activity.create({ data });
        }
        return prisma.activity.create({ data });
    },

    /**
     * Get the activity timeline for a specific person.
     */
    async getPersonTimeline(personId: string, skip: number = 0, take: number = 50, hiddenTypePrefixes: string[] = []) {
        // Entries the reader may not know about (for example choreographer finance) are left out
        // of both the page and the count.
        const where = { personId, NOT: hiddenTypePrefixes.map(prefix => ({ type: { startsWith: prefix } })) };
        const [activities, total] = await prisma.$transaction([
            prisma.activity.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
            prisma.activity.count({ where }),
        ]);

        return { data: activities, total };
    },

    /**
     * Express middleware compatible history recorder, writes to both Activity and AuditLog
     */
    async recordHistory(
        tx: Prisma.TransactionClient,
        req: Request,
        input: {
            type: string;
            entityType: string;
            entityId: string;
            personId?: string;
            eventId?: string;
            metadata?: Record<string, any>;
        }
    ) {
        const actorUserId = req.res?.locals?.user?.id as string | undefined;

        await tx.activity.create({
            data: {
                personId: input.personId,
                eventId: input.eventId,
                type: input.type,
                entityType: input.entityType,
                entityId: input.entityId,
                actorUserId,
                metadata: input.metadata || {},
            },
        });

        // Also write to AuditLog (technical log)
        await tx.auditLog.create({
            data: {
                action: input.type,
                entityType: input.entityType,
                entityId: input.entityId,
                actorUserId,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            },
        });
        await emitHistoryEvent(tx, input);
    }
};
