import { Event } from '@/entities/Event/@x/conversation';
import { Person } from '@/entities/Person/@x/conversation';

export interface MessageAttachment {
    filename: string;
    contentType: string;
    size: number;
}

export interface Message {
    id: string;
    direction: string;
    sender: string;
    recipient: string;
    bodyText: string;
    providerConnectionId?: string | null;
    receivedAt?: string | null;
    sentAt?: string | null;
    isRead?: boolean;
    rawData?: { attachments?: MessageAttachment[] } | null;
    createdAt: string;
}

export interface DraftSnapshot {
    needsStaffReview?: boolean;
    answerability?: string | null;
    warnings?: string[];
}

export interface Draft {
    id: string;
    content: string;
    status: string;
    confidence?: number | null;
    contextSnapshot?: DraftSnapshot | null;
}

export interface Conversation {
    id: string;
    subject: string;
    status: string;
    person?: Person;
    event?: Event;
    lastMessageAt?: string;
    messages?: Message[];
    drafts?: Draft[];
    unreadCount?: number;
}

export interface ConversationFilters {
    providerConnectionId?: string;
    q?: string;
    personId?: string;
}

export interface DraftModelChoice {
    providerConnectionId?: string;
    model?: string;
    draftPromptId?: string;
}

export interface ComposeEmailInput {
    providerConnectionId: string;
    recipient: string;
    subject: string;
    content: string;
}

export type ConversationDisposition = 'SPAM' | 'TRASH';

export interface BulkDispositionResult {
    applied: string[];
    failed: { id: string; code: string }[];
}
