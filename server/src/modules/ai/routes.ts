import { Router, Request } from 'express';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { currentUser, hasPermission, permitted } from '../auth/auth.middleware';
import { acceptAttachments, toAttachments } from '../communications/attachments';
import { ApiError, entityId, route } from '../../common/http';
import { sendReply } from '../communications/send';
import { generateDraft } from './draft.service';
import { assertDraftCanApprove } from './approval';

export const aiRouter = Router();

const draftRequestSchema = z.object({
    providerConnectionId: z.string().uuid().optional(),
    model: z.string().trim().min(1).max(200).optional(),
    // A saved reply-prompt version to try instead of the active one.
    draftPromptId: z.string().uuid().optional(),
}).strict();

// Real replies use the model saved on the provider and the active prompt; picking another model
// or prompt version for a single draft is a testing tool and needs the right to manage AI.
export const draftSelection = (body: unknown, permissions: string[]) => {
    const input = draftRequestSchema.parse(body ?? {});
    const modelChosen = Boolean(input.providerConnectionId || input.model);
    if ((modelChosen || input.draftPromptId) && !hasPermission(permissions, 'ai.manage')) throw new ApiError(403, 'FORBIDDEN', 'Choosing a model or prompt requires the AI management permission');
    return {
        ai: modelChosen ? { connectionId: input.providerConnectionId, model: input.model } : undefined,
        draftPromptId: input.draftPromptId,
    };
};

aiRouter.post('/conversations/:id/ai-draft', permitted('ai.use'), route(async req => {
    const user = currentUser(req);
    return generateDraft(entityId(req), user.id, draftSelection(req.body, user.permissions));
}));

aiRouter.post('/ai-drafts/:id/approve', permitted('ai.use'), acceptAttachments, route(async req => {
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
        userId,
        toAttachments(req.files),
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
