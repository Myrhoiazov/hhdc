import { Conversation } from '@/entities/Conversation';

export const actionableDraft = (conversation: Conversation) =>
    conversation.drafts?.find((draft) => ['GENERATED', 'EDITED'].includes(draft.status));

export const conversationProvider = (conversation: Conversation) =>
    [...(conversation.messages ?? [])].reverse().find((message) => message.providerConnectionId)
        ?.providerConnectionId || '';
