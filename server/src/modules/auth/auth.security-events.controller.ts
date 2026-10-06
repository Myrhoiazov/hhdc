import { Request, Response } from 'express';
import { AuthSecurityEventType, Prisma } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';

export const authSecurityEventListSelect = {
    id: true,
    type: true,
    actorUserId: true,
    targetUserId: true,
    metadata: true,
    createdAt: true,
} satisfies Prisma.AuthSecurityEventSelect;

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const parseNumberOr = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export const parseAuthSecurityEventsQuery = (query: Partial<Record<string, unknown>>) => {
    const page = Math.max(parseNumberOr(query._page, 1), 1);
    const limit = Math.min(Math.max(parseNumberOr(query._limit, DEFAULT_LIMIT), 1), MAX_LIMIT);

    const type = typeof query.type === 'string'
        && (Object.values(AuthSecurityEventType) as string[]).includes(query.type)
        ? query.type as AuthSecurityEventType
        : undefined;

    const targetUserId = typeof query.targetUserId === 'string' && Number.isInteger(Number(query.targetUserId))
        ? Number(query.targetUserId)
        : undefined;

    const where: Prisma.AuthSecurityEventWhereInput = {
        ...(type ? { type } : {}),
        ...(targetUserId !== undefined ? { targetUserId } : {}),
    };

    return { page, limit, where };
};

export const getAuthSecurityEventsController = async (req: Request, res: Response) => {
    const { page, limit, where } = parseAuthSecurityEventsQuery(req.query);

    const [items, total] = await Promise.all([
        prisma.authSecurityEvent.findMany({
            where,
            select: authSecurityEventListSelect,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.authSecurityEvent.count({ where }),
    ]);

    return res.status(200).json({
        items,
        total,
        page,
        limit,
        totalPages: Math.max(Math.ceil(total / limit), 1),
    });
};
