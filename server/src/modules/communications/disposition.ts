import prisma from '../../../prisma/prisma-client';
import type { EmailDisposition, RemoteEmailRef } from '../../integrations/email/EmailProvider';
import { ApiError } from '../../common/http';
import { emailProvider } from './send';
import { groupRemoteMessages, type ProviderLinkedMessage } from './remote-refs';

interface StoredConversation { id: string; messages: ProviderLinkedMessage[] }

export interface ConversationDispositionDeps {
    loadConversation(id: string): Promise<StoredConversation | null>;
    applyRemote(providerId: string, messages: RemoteEmailRef[], disposition: EmailDisposition): Promise<void>;
    removeLocal(conversationId: string, disposition: EmailDisposition, actorUserId: string): Promise<void>;
}

export const applyConversationDisposition = async (
    conversationId: string,
    disposition: EmailDisposition,
    actorUserId: string,
    deps: ConversationDispositionDeps = productionDeps,
) => {
    const conversation = await deps.loadConversation(conversationId);
    if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
    // A conversation that only holds letters sent from the CRM has nothing in the remote inbox,
    // so it is simply removed here; the copy in the mailbox's Sent folder is left alone.
    const groups = groupRemoteMessages(conversation.messages);
    for (const [providerId, messages] of groups) await deps.applyRemote(providerId, messages, disposition);
    await deps.removeLocal(conversationId, disposition, actorUserId);
};

const loadConversation: ConversationDispositionDeps['loadConversation'] = id => prisma.conversation.findUnique({
    where: { id },
    select: { id: true, messages: { select: { direction: true, providerConnectionId: true, externalId: true, rawData: true } } },
});

const applyRemote: ConversationDispositionDeps['applyRemote'] = async (providerId, messages, disposition) => {
    const { provider } = await emailProvider(providerId);
    try { await provider.applyDisposition(messages, disposition); }
    catch { throw new ApiError(502, 'REMOTE_MAILBOX_UPDATE_FAILED', 'Mailbox provider did not confirm the action'); }
};

const removeLocal: ConversationDispositionDeps['removeLocal'] = async (conversationId, disposition, actorUserId) => {
    await prisma.$transaction(async tx => {
        await tx.externalIdentity.deleteMany({ where: { entityType: 'EMAIL_THREAD', entityId: conversationId } });
        await tx.conversation.delete({ where: { id: conversationId } });
        await tx.auditLog.create({ data: {
            actorUserId, action: disposition === 'SPAM' ? 'CONVERSATION_MARKED_SPAM' : 'CONVERSATION_DELETED',
            entityType: 'Conversation', entityId: conversationId,
        } });
    });
};

const productionDeps: ConversationDispositionDeps = { loadConversation, applyRemote, removeLocal };
