import { formatDate } from '@/shared/lib/format/date';
import { Conversation } from '@/entities/Conversation';
import { ProviderConnection } from '@/entities/Provider';

export const totalUnread = (unread: Record<string, number>, providers: ProviderConnection[]) =>
    providers.reduce((sum, provider) => sum + (unread[provider.id] ?? 0), 0);

export const senderName = (conversation: Conversation) =>
    conversation.person?.displayName ||
    conversation.person?.email ||
    conversation.messages?.[0]?.sender ||
    '—';

export const previewText = (conversation: Conversation) =>
    conversation.messages?.[0]?.bodyText || '';

export const formatListDate = (value?: string) =>
    value ? formatDate(value, { day: '2-digit', month: 'short' }) : '';
