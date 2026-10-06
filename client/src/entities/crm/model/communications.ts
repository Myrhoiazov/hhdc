import { $apiPrivate } from '@/shared/api/api';
import { Person, Event, PageResult } from './types';

export interface Message { id: string; direction: string; bodyText: string; createdAt: string }
export interface Draft { id: string; content: string; status: string }
export interface Conversation {
    id: string; subject: string; status: string; person?: Person; event?: Event;
    messages?: Message[]; drafts?: Draft[];
}
export interface KnowledgeDocument {
    id: string; title: string; scope: string; content: string; status: string; eventId?: string | null;
}
export const listConversations = async (): Promise<PageResult<Conversation>> => {
    const result = (await $apiPrivate.get<{data: Conversation[]; meta: {total: number}}>('/conversations')).data;
    return { data: result.data, total: result.meta.total };
};
export const getConversation = async (id: string) => (await $apiPrivate.get<{data: Conversation}>(`/conversations/${id}`)).data.data;
export const replyToConversation = async (id: string, content: string, providerConnectionId: string) => $apiPrivate.post(`/conversations/${id}/reply`, { content, providerConnectionId });
export const generateDraft = async (id: string) => $apiPrivate.post(`/conversations/${id}/ai-draft`);
export const approveDraft = async (id: string, content: string) => $apiPrivate.post(`/ai-drafts/${id}/approve`, { content });
export const rejectDraft = async (id: string) => $apiPrivate.post(`/ai-drafts/${id}/reject`);
export const listKnowledge = async (): Promise<PageResult<KnowledgeDocument>> => {
    const result = (await $apiPrivate.get<{data: KnowledgeDocument[]; meta: {total: number}}>('/knowledge')).data;
    return { data: result.data, total: result.meta.total };
};
export const saveKnowledge = async (input: Partial<KnowledgeDocument>, id?: string) => id ? $apiPrivate.patch(`/knowledge/${id}`, input) : $apiPrivate.post('/knowledge', input);
export const deleteKnowledge = async (id: string) => $apiPrivate.delete(`/knowledge/${id}`);
