import { Router, Request } from 'express';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { currentUser, hasPermission, permitted } from '../auth/auth.middleware';
import { acceptAttachments, toAttachments } from '../communications/attachments';
import { ApiError, entityId, route } from '../../common/http';
import { discardDraft, generateDraft } from './draft.service';
import { approveAndSendDraft } from './draft-approval';

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
    const input = z.object({ content: z.string().trim().min(1).max(20000) }).strict().parse(req.body);
    return approveAndSendDraft({ draftId: entityId(req), userId: currentUser(req).id, content: input.content, attachments: toAttachments(req.files) });
}));

aiRouter.post('/ai-drafts/:id/reject', permitted('ai.use'), route(req => discardDraft(entityId(req), currentUser(req).id)));
