import { Router } from 'express';
import { z } from 'zod';
import { ConversationStatus } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { currentUser, permitted } from '../auth/auth.middleware';
import { ApiError, entityId, route } from '../../common/http';
import { normalizePagination } from '../../common/http';
import { replySchema, sendReply } from './send';


export const communicationsRouter = Router();
communicationsRouter.get('/', permitted('communications.read'), async (req, res, next) => {
    try {
        const { page, pageSize, skip } = normalizePagination(req.query);
        const filters = z.object({ status: z.nativeEnum(ConversationStatus).optional(), eventId: z.string().uuid().optional() }).parse(req.query);
        const [data, total] = await prisma.$transaction([
            prisma.conversation.findMany({ where: filters, skip, take: pageSize, orderBy: { lastMessageAt: 'desc' }, include: { person: true, event: true } }),
            prisma.conversation.count({ where: filters }),
        ]);
        res.json({ data, meta: { page, pageSize, total } });
    } catch (error) { next(error); }
});
communicationsRouter.get('/:id', permitted('communications.read'), route(async req => {
    const data = await prisma.conversation.findUnique({ where: { id: entityId(req) }, include: {
        person: { include: { roles: true, tags: { include: { tag: true } } } }, event: true,
        messages: { orderBy: { createdAt: 'asc' }, take: 100 }, drafts: { orderBy: { createdAt: 'desc' }, take: 20 },
    } });
    if (!data) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
    return data;
}));
communicationsRouter.patch('/:id', permitted('communications.reply'), route(async req => {
    const input = z.object({ status: z.nativeEnum(ConversationStatus).optional(), eventId: z.string().uuid().nullable().optional(), personId: z.string().uuid().nullable().optional(), assignedUserId: z.string().uuid().nullable().optional() }).strict().parse(req.body);
    return prisma.$transaction(async tx => {
        const data = await tx.conversation.update({ where: { id: entityId(req) }, data: input });
        await tx.auditLog.create({ data: { actorUserId: currentUser(req).id, action: 'CONVERSATION_UPDATED', entityType: 'Conversation', entityId: data.id } });
        return data;
    });
}));
communicationsRouter.post('/:id/reply', permitted('communications.reply'), route(req => sendReply(entityId(req), replySchema.parse(req.body), currentUser(req).id)));

