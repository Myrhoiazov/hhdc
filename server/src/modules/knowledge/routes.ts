import { Router, Request } from 'express';
import { KnowledgeScope, KnowledgeStatus } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { currentUser, permitted } from '../auth/auth.middleware';
import { ApiError, entityId, route } from '../../common/http';
import { normalizePagination } from '../../common/http';
import { reindexDocument, replaceTextChunks } from './service';

const knowledgeSchema = z.object({ title: z.string().trim().min(1).max(300), content: z.string().trim().min(1).max(200000),
    scope: z.nativeEnum(KnowledgeScope).default('GLOBAL'), eventId: z.string().uuid().nullable().optional(),
    status: z.nativeEnum(KnowledgeStatus).default('DRAFT'), sourceType: z.literal('MANUAL').default('MANUAL') }).strict();
const assertScope = (scope: string, eventId?: string | null) => {
    if ((scope === 'EVENT') !== Boolean(eventId)) throw new ApiError(400, 'KNOWLEDGE_SCOPE_MISMATCH', 'Event knowledge requires an event; global knowledge must not specify one');
};
const saveKnowledge = async (req: Request, id?: string) => {
    const input = id ? knowledgeSchema.partial().parse(req.body) : knowledgeSchema.parse(req.body);
    const existing = id ? await prisma.knowledgeDocument.findUnique({ where: { id } }) : null;
    if (id && !existing) throw new ApiError(404, 'KNOWLEDGE_NOT_FOUND', 'Knowledge document not found');
    const effective = { ...existing, ...input };
    assertScope(effective.scope, effective.eventId);
    return prisma.$transaction(async tx => {
        const document = id ? await tx.knowledgeDocument.update({ where: { id }, data: input })
            : await tx.knowledgeDocument.create({ data: knowledgeSchema.parse(input) as any });
        if (!existing || input.content !== undefined) await replaceTextChunks(tx, document.id, document.content);
        await tx.auditLog.create({ data: { actorUserId: currentUser(req).id, action: id ? 'KNOWLEDGE_UPDATED' : 'KNOWLEDGE_CREATED', entityType: 'KnowledgeDocument', entityId: document.id } });
        return document;
    });
};

export const knowledgeRouter = Router();
knowledgeRouter.get('/', permitted('knowledge.read'), async (req, res, next) => {
    try {
        const { page, pageSize, skip } = normalizePagination(req.query);
        const filters = z.object({ eventId: z.string().uuid().optional(), scope: z.nativeEnum(KnowledgeScope).optional() }).parse(req.query);
        const [data, total] = await prisma.$transaction([prisma.knowledgeDocument.findMany({ where: filters, skip, take: pageSize, orderBy: { updatedAt: 'desc' } }), prisma.knowledgeDocument.count({ where: filters })]);
        res.json({ data, meta: { page, pageSize, total } });
    } catch (error) { next(error); }
});
knowledgeRouter.get('/:id', permitted('knowledge.read'), route(async req => {
    const document = await prisma.knowledgeDocument.findUnique({ where: { id: entityId(req) } });
    if (!document) throw new ApiError(404, 'KNOWLEDGE_NOT_FOUND', 'Knowledge document not found');
    return document;
}));
knowledgeRouter.post('/', permitted('knowledge.manage'), route(req => saveKnowledge(req)));
knowledgeRouter.patch('/:id', permitted('knowledge.manage'), route(req => saveKnowledge(req, entityId(req))));
knowledgeRouter.delete('/:id', permitted('knowledge.manage'), route(async req => prisma.$transaction(async tx => {
    const id = entityId(req);
    await tx.knowledgeDocument.delete({ where: { id } });
    await tx.auditLog.create({ data: { actorUserId: currentUser(req).id, action: 'KNOWLEDGE_DELETED', entityType: 'KnowledgeDocument', entityId: id } });
    return { deleted: true };
})));
knowledgeRouter.post('/:id/reindex', permitted('knowledge.manage'), route(req => reindexDocument(entityId(req))));
