import { Conversation } from '@/entities/crm';

// NEW: unread incoming mail. SENT: the last letter in the thread is ours. OPENED: incoming and read.
export type MailState = 'NEW' | 'SENT' | 'OPENED';

export const mailState = (conversation: Conversation): MailState => {
    if ((conversation.unreadCount ?? 0) > 0) return 'NEW';
    return conversation.messages?.[0]?.direction === 'OUTBOUND' ? 'SENT' : 'OPENED';
};
