import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { GmailEmailProvider } from '../../integrations/email/gmail';
import { ApiError } from '../../common/http';
import { decryptCredentials } from '../providers/providers.service';
import { assertDraftCanSend } from '../ai/approval';

export const replySchema = z.object({ content: z.string().trim().min(1).max(20000), providerConnectionId: z.string().uuid(), draftId: z.string().uuid().optional() }).strict();
type Reply = z.infer<typeof replySchema>;

export const emailProvider = async (id: string) => {
    const connection = await prisma.providerConnection.findUnique({ where: { id } });
    if (!connection || connection.provider !== 'GMAIL' || connection.status === 'DISABLED') throw new ApiError(400, 'EMAIL_PROVIDER_UNAVAILABLE', 'Select an enabled Gmail provider');
    const credentials = connection.credentialsEncrypted ? decryptCredentials(connection.credentialsEncrypted) : {};
    return { connection, provider: new GmailEmailProvider(credentials) };
};

const claimDraft = async (id: string, conversationId: string, content: string) => {
    const draft = await prisma.aiDraft.findUnique({ where: { id } });
    if (!draft || draft.conversationId !== conversationId) throw new ApiError(404, 'DRAFT_NOT_FOUND', 'Draft not found');
    assertDraftCanSend(draft);
    if (draft.content !== content) throw new ApiError(409, 'DRAFT_CHANGED', 'Approve the edited draft before sending');
    const result = await prisma.aiDraft.updateMany({ where: { id, status: 'APPROVED' }, data: { status: 'SENDING', sendIdempotencyKey: draft.sendIdempotencyKey ?? randomUUID() } });
    if (!result.count) throw new ApiError(409, 'DRAFT_ALREADY_CLAIMED', 'Draft is already being sent');
};

const recordSent = async (input: { conversationId: string; reply: Reply; userId: string; sender: string; recipient: string; externalId: string }) => prisma.$transaction(async tx => {
    const message = await tx.message.create({ data: {
        conversationId: input.conversationId, providerConnectionId: input.reply.providerConnectionId,
        direction: 'OUTBOUND', sender: input.sender, recipient: input.recipient, bodyText: input.reply.content,
        externalId: input.externalId, sentAt: new Date(),
    } });
    const conversation = await tx.conversation.update({ where: { id: input.conversationId }, data: { status: 'WAITING', lastMessageAt: new Date() } });
    if (input.reply.draftId) await tx.aiDraft.update({ where: { id: input.reply.draftId }, data: { status: 'SENT' } });
    await tx.activity.create({ data: { personId: conversation.personId, eventId: conversation.eventId, actorUserId: input.userId, type: 'EMAIL_SENT', entityType: 'Message', entityId: message.id, metadata: {} } });
    await tx.auditLog.create({ data: { actorUserId: input.userId, action: 'EMAIL_SENT', entityType: 'Message', entityId: message.id } });
    return message;
});

export const sendReply = async (conversationId: string, reply: Reply, userId: string) => {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { person: true, messages: { where: { direction: 'INBOUND' }, orderBy: { receivedAt: 'desc' }, take: 1 } } });
    if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
    const inbound = conversation.messages[0];
    if (!inbound) throw new ApiError(400, 'NO_REPLY_RECIPIENT', 'No incoming message to reply to');
    const { connection, provider } = await emailProvider(reply.providerConnectionId);
    const settings = z.object({ sender: z.string().email() }).parse(connection.settings);
    if (reply.draftId) await claimDraft(reply.draftId, conversationId, reply.content);
    const metadata = z.object({ threadId: z.string().optional(), messageId: z.string().nullable().optional() }).parse(inbound.rawData ?? {});
    let sent: { externalId: string };
    try {
        sent = await provider.sendMessage({ sender: settings.sender, recipient: inbound.sender, subject: `Re: ${conversation.subject}`,
            content: reply.content, threadId: metadata.threadId, replyToMessageId: metadata.messageId ?? undefined,
            messageId: reply.draftId ? `<${reply.draftId}@hhdc-crm.local>` : undefined });
    } catch {
        // SENDING is deliberately retained: a timed-out request may have reached Gmail.
        // Reconciliation must confirm the provider message before another attempt.
        if (reply.draftId) await prisma.aiDraft.update({ where: { id: reply.draftId }, data: { sendError: 'Provider did not confirm delivery; reconciliation required' } });
        throw new ApiError(502, 'EMAIL_SEND_UNCONFIRMED', 'Provider did not confirm delivery; check the mailbox before retrying');
    }
    return recordSent({ conversationId, reply, userId, sender: settings.sender, recipient: inbound.sender, externalId: sent.externalId });
};
