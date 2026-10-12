import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import type { EmailAttachment } from '../../integrations/email/EmailProvider';
import { sendReply } from '../communications/send';
import { assertDraftCanApprove } from './approval';

export interface DraftApproval {
    draftId: string;
    userId: string;
    // The text as the person left it; without it the draft goes out as it was written.
    content?: string;
    attachments?: EmailAttachment[];
}

const loadApprovable = async (draftId: string) => {
    const draft = await prisma.aiDraft.findUnique({
        where: { id: draftId },
        include: { conversation: { include: { messages: { where: { direction: 'INBOUND' }, orderBy: { receivedAt: 'desc' }, take: 1 } } } },
    });
    if (!draft) throw new ApiError(404, 'DRAFT_NOT_FOUND', 'Draft not found');
    assertDraftCanApprove(draft.status);
    const inbound = draft.conversation.messages[0];
    if (!inbound) throw new ApiError(400, 'NO_REPLY_RECIPIENT', 'No incoming message to reply to');
    if (!inbound.providerConnectionId) throw new ApiError(400, 'NO_PROVIDER_CONNECTION', 'Incoming message lacks provider connection');
    return { draft, providerConnectionId: inbound.providerConnectionId };
};

const markApproved = (draftId: string, content: string, userId: string) => prisma.$transaction(async tx => {
    await tx.aiDraft.update({ where: { id: draftId }, data: { status: 'APPROVED', content, approvedBy: userId, approvedAt: new Date() } });
    await tx.auditLog.create({ data: { actorUserId: userId, action: 'AI_DRAFT_APPROVED', entityType: 'AiDraft', entityId: draftId } });
});

// A person's approval is what sends an AI draft: it is recorded first, then the reply goes out
// from the mailbox the letter came to. Used by the CRM and by the Telegram buttons alike.
export const approveAndSendDraft = async ({ draftId, userId, content, attachments = [] }: DraftApproval) => {
    const { draft, providerConnectionId } = await loadApprovable(draftId);
    const text = content ?? draft.content;
    await markApproved(draftId, text, userId);
    const message = await sendReply(draft.conversationId, { content: text, providerConnectionId, draftId }, userId, attachments);
    return { draft: await prisma.aiDraft.findUnique({ where: { id: draftId } }), message };
};
