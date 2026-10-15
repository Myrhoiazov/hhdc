import { $apiPrivate } from '@/shared/api/api';
import { PageResult, postData, readData, readPage } from '@/shared/api/request';
import {
    Draft,
    Conversation,
    ConversationFilters,
    DraftModelChoice,
    ComposeEmailInput,
    ConversationDisposition,
    BulkDispositionResult,
} from '../model/types';

// A letter with files is sent as multipart form data; without files it stays plain JSON.
const withAttachments = (
    fields: Record<string, string>,
    files: File[]
): Record<string, string> | FormData => {
    if (!files.length) return fields;
    const form = new FormData();
    Object.entries(fields).forEach(([name, value]) => form.append(name, value));
    files.forEach((file) => form.append('attachments', file));
    return form;
};

export const listConversations = async (
    filters: ConversationFilters = {},
    page = 1,
    pageSize = 25
): Promise<PageResult<Conversation>> => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filters.providerConnectionId)
        params.set('providerConnectionId', filters.providerConnectionId);
    if (filters.q?.trim()) params.set('q', filters.q.trim());
    if (filters.personId) params.set('personId', filters.personId);
    return readPage<Conversation>(`/conversations?${params}`);
};

export const getConversation = async (id: string) => readData<Conversation>(`/conversations/${id}`);

// Opening a thread mirrors the read state back to the mailbox and the CRM list.
export const markConversationRead = async (id: string): Promise<void> => {
    await $apiPrivate.post(`/conversations/${id}/read`);
};

// Conversations with unread incoming mail per mailbox id; a mailbox with none is absent.
export const getUnreadByMailbox = async () =>
    readData<Record<string, number>>('/conversations/unread-counts');

// The server sends a reply from the mailbox the letter came to; the id matters only for a thread no mailbox owns.
export const replyToConversation = async (
    id: string,
    content: string,
    providerConnectionId: string,
    files: File[] = []
) =>
    $apiPrivate.post(
        `/conversations/${id}/reply`,
        withAttachments({ content, providerConnectionId }, files)
    );

// `choice` sends this one draft to another connected provider or model; without it the provider's own model answers.
export const generateDraft = async (id: string, choice: DraftModelChoice = {}) =>
    postData<Draft>(`/conversations/${id}/ai-draft`, choice);

// Approving sends the text as it stands in the reply field, with any attached files.
export const approveDraft = async (id: string, content: string, files: File[] = []) =>
    $apiPrivate.post(`/ai-drafts/${id}/approve`, withAttachments({ content }, files));

export const rejectDraft = async (id: string) => $apiPrivate.post(`/ai-drafts/${id}/reject`);

// Sends a new letter; the server stores it as a new conversation once the mailbox accepts it.
export const composeEmail = async (input: ComposeEmailInput, files: File[] = []): Promise<void> => {
    await $apiPrivate.post('/conversations', withAttachments({ ...input }, files));
};

export const applyConversationDisposition = async (
    id: string,
    disposition: ConversationDisposition
): Promise<void> => {
    await $apiPrivate.post(`/conversations/${id}/disposition`, { disposition });
};

// Several conversations at once; the answer names the ones the mailbox refused.
export const applyBulkConversationDisposition = async (
    ids: string[],
    disposition: ConversationDisposition
) => postData<BulkDispositionResult>('/conversations/disposition', { ids, disposition });
