import prisma from '../../../prisma/prisma-client';
import type { RemoteEmailRef } from '../../integrations/email/EmailProvider';
import { ApiError } from '../../common/http';
import { logger } from '../../common/logger';
import { emailProvider } from './send';
import { groupRemoteMessages, type ProviderLinkedMessage } from './remote-refs';

export interface StoredUnreadMessage extends ProviderLinkedMessage { id: string }
export interface StoredUnreadConversation { id: string; messages: StoredUnreadMessage[] }

export interface ConversationReadDeps {
    loadUnread(conversationId: string): Promise<StoredUnreadConversation | null>;
    markLocal(conversationId: string, messageIds: string[]): Promise<number>;
    markRemote(providerId: string, messages: RemoteEmailRef[]): Promise<void>;
}

const loadUnread: ConversationReadDeps['loadUnread'] = id => prisma.conversation.findUnique({
    where: { id },
    select: { id: true, messages: {
        where: { direction: 'INBOUND', isRead: false },
        select: { id: true, direction: true, providerConnectionId: true, externalId: true, rawData: true },
    } },
});

const markLocal: ConversationReadDeps['markLocal'] = async (conversationId, messageIds) => {
    const result = await prisma.message.updateMany({
        where: { id: { in: messageIds }, conversationId, direction: 'INBOUND', isRead: false },
        data: { isRead: true },
    });
    return result.count;
};

const markRemote: ConversationReadDeps['markRemote'] = async (providerId, messages) => {
    const { provider } = await emailProvider(providerId);
    await provider.markRead(messages);
};

// A mailbox that rejects the flag must not make the CRM pretend the message is unread.
const propagateToMailbox = async (messages: StoredUnreadMessage[], markRemote: ConversationReadDeps['markRemote']) => {
    for (const [providerId, refs] of groupRemoteMessages(messages)) {
        try {
            await markRemote(providerId, refs);
        } catch (error) {
            logger.warn(`[communications] mailbox ${providerId} was not told about the read state: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
};

export const markConversationRead = async (conversationId: string, deps: ConversationReadDeps = productionDeps): Promise<{ marked: number }> => {
    const conversation = await deps.loadUnread(conversationId);
    if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
    if (!conversation.messages.length) return { marked: 0 };
    const marked = await deps.markLocal(conversationId, conversation.messages.map(message => message.id));
    if (marked) await propagateToMailbox(conversation.messages, deps.markRemote);
    return { marked };
};

const productionDeps: ConversationReadDeps = { loadUnread, markLocal, markRemote };