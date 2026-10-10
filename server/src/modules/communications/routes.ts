import { Router } from 'express';
import { z } from 'zod';
import { ConversationStatus } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { currentUser, permitted } from '../auth/auth.middleware';
import { ApiError, entityId, route } from '../../common/http';
import { normalizePagination } from '../../common/http';
import { replySchema, sendReply } from './send';
import { composeEmail, composeSchema } from './compose';
import { acceptAttachments, toAttachments } from './attachments';
import { buildConversationWhere, parseConversationQuery } from './conversation-query';
import { applyConversationDisposition } from './disposition';
import { applyBulkDisposition, bulkDispositionSchema } from './bulk-disposition';
import { markConversationRead } from './read';
import { unreadByMailbox } from './unread-counts';


export const communicationsRouter = Router();

const PERSON_WITH_ORDERS = { _count: { select: { orders: true } } } as const;

// The list payload exposes unread as a plain number instead of Prisma's _count shape.
const withUnreadCount = <T extends { _count: { messages: number } }>(conversation: T) => {
    const { _count, ...rest } = conversation;
    return { ...rest, unreadCount: _count.messages };
};

communicationsRouter.get('/', permitted('communications.read'), async (req, res, next) => {
    try {
        const { page, pageSize, skip } = normalizePagination(req.query);
        const filters = buildConversationWhere(parseConversationQuery(req.query));
        const [rows, total] = await prisma.$transaction([
            prisma.conversation.findMany({
                where: filters,
                skip,
                take: pageSize,
                orderBy: { lastMessageAt: 'desc' },
                include: {
                    // The number of orders tells the inbox whether the sender is a client.
                    person: { include: PERSON_WITH_ORDERS },
                    event: true,
                    messages: { orderBy: { createdAt: 'desc' }, take: 1 },
                    _count: { select: { messages: { where: { isRead: false } } } },
                },
            }),
            prisma.conversation.count({ where: filters }),
        ]);
        res.json({ data: rows.map(withUnreadCount), meta: { page, pageSize, total } });
    } catch (error) { next(error); }
});
communicationsRouter.post('/', permitted('communications.reply'), acceptAttachments, route(req => composeEmail(composeSchema.parse(req.body), currentUser(req).id, { attachments: toAttachments(req.files) })));
communicationsRouter.post('/disposition', permitted('communications.write'), route(req => applyBulkDisposition(bulkDispositionSchema.parse(req.body), currentUser(req).id)));
communicationsRouter.get('/unread-counts', permitted('communications.read'), route(() => unreadByMailbox()));
communicationsRouter.get('/:id', permitted('communications.read'), route(async req => {
    const data = await prisma.conversation.findUnique({ where: { id: entityId(req) }, include: {
        person: { include: { roles: true, tags: { include: { tag: true } }, ...PERSON_WITH_ORDERS } }, event: true,
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
communicationsRouter.post('/:id/reply', permitted('communications.reply'), acceptAttachments, route(req => sendReply(entityId(req), replySchema.parse(req.body), currentUser(req).id, toAttachments(req.files))));
communicationsRouter.post('/:id/read', permitted('communications.read'), route(async req => markConversationRead(entityId(req))));
communicationsRouter.post('/:id/disposition', permitted('communications.write'), route(async req => {
    const { disposition } = z.object({ disposition: z.enum(['SPAM', 'TRASH']) }).strict().parse(req.body);
    await applyConversationDisposition(entityId(req), disposition, currentUser(req).id);
    return { success: true };
}));
