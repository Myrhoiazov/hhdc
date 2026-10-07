import { Router, Request } from 'express';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { currentUser, permitted } from '../auth/auth.middleware';
import { ApiError, entityId, route } from '../../common/http';
import { sendReply } from '../communications/send';
import { generateDraft } from './draft.service';
import { assertDraftCanApprove } from './approval';

export const aiRouter = Router();

aiRouter.post('/conversations/:id/ai-draft', permitted('ai.use'), route(async req => {
    const conversationId = entityId(req);
    const draft = await generateDraft(conversationId, currentUser(req).id);
    return draft;
}));

aiRouter.post('/ai-drafts/:id/approve', permitted('ai.use'), route(async req => {
    const draftId = entityId(req);
    const userId = currentUser(req).id;
    const input = z.object({ content: z.string().trim().min(1).max(20000) }).strict().parse(req.body);
    
    // Find draft
    const draft = await prisma.aiDraft.findUnique({
        where: { id: draftId },
        include: { conversation: { include: { messages: { where: { direction: 'INBOUND' }, orderBy: { receivedAt: 'desc' }, take: 1 } } } }
    });
    
    if (!draft) throw new ApiError(404, 'DRAFT_NOT_FOUND', 'Draft not found');
    assertDraftCanApprove(draft.status);
    
    const inbound = draft.conversation.messages[0];
    if (!inbound) throw new ApiError(400, 'NO_REPLY_RECIPIENT', 'No incoming message to reply to');
    if (!inbound.providerConnectionId) throw new ApiError(400, 'NO_PROVIDER_CONNECTION', 'Incoming message lacks provider connection');

    // Mark as approved first
    const approvedDraft = await prisma.$transaction(async tx => {
        const updated = await tx.aiDraft.update({
            where: { id: draftId },
            data: { status: 'APPROVED', content: input.content, approvedBy: userId, approvedAt: new Date() }
        });
        await tx.auditLog.create({
            data: { actorUserId: userId, action: 'AI_DRAFT_APPROVED', entityType: 'AiDraft', entityId: draftId }
        });
        return updated;
    });
    
    // Then send the reply
    const message = await sendReply(
        draft.conversationId, 
        { content: input.content, providerConnectionId: inbound.providerConnectionId, draftId },
        userId
    );
    
    return { draft: await prisma.aiDraft.findUnique({ where: { id: draftId } }), message };
}));

aiRouter.post('/ai-drafts/:id/reject', permitted('ai.use'), route(async req => {
    const draftId = entityId(req);
    const userId = currentUser(req).id;
    
    const draft = await prisma.aiDraft.findUnique({ where: { id: draftId } });
    if (!draft) throw new ApiError(404, 'DRAFT_NOT_FOUND', 'Draft not found');
    if (draft.status !== 'GENERATED') {
        throw new ApiError(409, 'INVALID_DRAFT_STATUS', 'Draft is not in GENERATED status');
    }
    
    const updated = await prisma.$transaction(async tx => {
        const result = await tx.aiDraft.update({
            where: { id: draftId },
            data: { status: 'REJECTED' }
        });
        await tx.auditLog.create({
            data: { actorUserId: userId, action: 'AI_DRAFT_REJECTED', entityType: 'AiDraft', entityId: draftId }
        });
        return result;
    });
    return updated;
}));
