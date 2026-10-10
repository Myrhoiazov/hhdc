import { $apiPrivate } from '@/shared/api/api';
import { Person, Event, PageResult } from './types';

export interface MessageAttachment { filename: string; contentType: string; size: number }
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
export interface DraftSnapshot { needsStaffReview?: boolean; answerability?: string | null; warnings?: string[] }
export interface Draft { id: string; content: string; status: string; confidence?: number | null; contextSnapshot?: DraftSnapshot | null }
export interface Conversation {
    id: string; subject: string; status: string; person?: Person; event?: Event;
    lastMessageAt?: string; messages?: Message[]; drafts?: Draft[];
    unreadCount?: number;
}
export interface ConversationFilters { providerConnectionId?: string; q?: string; personId?: string }
// A client is a person with at least one purchase.
export const isClient = (person?: Person | null): boolean => (person?._count?.orders ?? 0) > 0;
export interface KnowledgeDocument {
    id: string; title: string; scope: string; content: string; status: string; eventId?: string | null; sourceType?: string; updatedAt?: string;
}
export interface KnowledgeFilters { q: string; scope: string; status: string }
export const KNOWLEDGE_PAGE_SIZE = 25;
// A letter with files is sent as multipart form data; without files it stays plain JSON.
const withAttachments = (fields: Record<string, string>, files: File[]): Record<string, string> | FormData => {
    if (!files.length) return fields;
    const form = new FormData();
    Object.entries(fields).forEach(([name, value]) => form.append(name, value));
    files.forEach((file) => form.append('attachments', file));
    return form;
};
export const listConversations = async (filters: ConversationFilters = {}, page = 1, pageSize = 25): Promise<PageResult<Conversation>> => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filters.providerConnectionId) params.set('providerConnectionId', filters.providerConnectionId);
    if (filters.q?.trim()) params.set('q', filters.q.trim());
    if (filters.personId) params.set('personId', filters.personId);
    const result = (await $apiPrivate.get<{data: Conversation[]; meta: {total: number}}>(`/conversations?${params}`)).data;
    return { data: result.data, total: result.meta.total };
};
export const getConversation = async (id: string) => (await $apiPrivate.get<{data: Conversation}>(`/conversations/${id}`)).data.data;
// Opening a thread mirrors the read state back to the mailbox and the CRM list.
export const markConversationRead = async (id: string): Promise<void> => {
    await $apiPrivate.post(`/conversations/${id}/read`);
};
// Conversations with unread incoming mail per mailbox id; a mailbox with none is absent.
export const getUnreadByMailbox = async (): Promise<Record<string, number>> =>
    (await $apiPrivate.get<{data: Record<string, number>}>('/conversations/unread-counts')).data.data;
// The server sends a reply from the mailbox the letter came to; the id matters only for a thread no mailbox owns.
export const replyToConversation = async (id: string, content: string, providerConnectionId: string, files: File[] = []) => $apiPrivate.post(`/conversations/${id}/reply`, withAttachments({ content, providerConnectionId }, files));
export interface DraftModelChoice { providerConnectionId?: string; model?: string; draftPromptId?: string }
// `choice` sends this one draft to another connected provider or model; without it the provider's own model answers.
export const generateDraft = async (id: string, choice: DraftModelChoice = {}) => (await $apiPrivate.post<{data: Draft}>(`/conversations/${id}/ai-draft`, choice)).data.data;
// Approving sends the text as it stands in the reply field, with any attached files.
export const approveDraft = async (id: string, content: string, files: File[] = []) => $apiPrivate.post(`/ai-drafts/${id}/approve`, withAttachments({ content }, files));
export const rejectDraft = async (id: string) => $apiPrivate.post(`/ai-drafts/${id}/reject`);
export interface ComposeEmailInput { providerConnectionId: string; recipient: string; subject: string; content: string }
// Sends a new letter; the server stores it as a new conversation once the mailbox accepts it.
export const composeEmail = async (input: ComposeEmailInput, files: File[] = []): Promise<void> => {
    await $apiPrivate.post('/conversations', withAttachments({ ...input }, files));
};
export type ConversationDisposition = 'SPAM' | 'TRASH';
export const applyConversationDisposition = async (id: string, disposition: ConversationDisposition): Promise<void> => {
    await $apiPrivate.post(`/conversations/${id}/disposition`, { disposition });
};
export interface BulkDispositionResult { applied: string[]; failed: { id: string; code: string }[] }
// Several conversations at once; the answer names the ones the mailbox refused.
export const applyBulkConversationDisposition = async (ids: string[], disposition: ConversationDisposition): Promise<BulkDispositionResult> =>
    (await $apiPrivate.post<{data: BulkDispositionResult}>('/conversations/disposition', { ids, disposition })).data.data;
export const listKnowledge = async (filters: KnowledgeFilters, page: number): Promise<PageResult<KnowledgeDocument>> => {
    const query = new URLSearchParams({ ...filters, page: String(page), pageSize: String(KNOWLEDGE_PAGE_SIZE) }).toString();
    const result = (await $apiPrivate.get<{data: KnowledgeDocument[]; meta: {total: number}}>(`/knowledge?${query}`)).data;
    return { data: result.data, total: result.meta.total };
};
export const saveKnowledge = async (input: Partial<KnowledgeDocument>, id?: string) => id ? $apiPrivate.patch(`/knowledge/${id}`, input) : $apiPrivate.post('/knowledge', input);
export const deleteKnowledge = async (id: string) => $apiPrivate.delete(`/knowledge/${id}`);
