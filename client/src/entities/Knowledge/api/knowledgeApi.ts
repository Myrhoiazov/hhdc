import { $apiPrivate } from '@/shared/api/api';
import { PageResult, postData, readPage } from '@/shared/api/request';
import {
    KnowledgeSyncSummary,
    KnowledgeDocument,
    KnowledgeFilters,
    KNOWLEDGE_PAGE_SIZE,
} from '../model/types';

// Brings the bundled knowledge files into the knowledge base and embeds them for the assistant.
export const syncKnowledgeV2 = async (overwrite = false) =>
    postData<KnowledgeSyncSummary>('/knowledge/sync-v2', { overwrite });

export const listKnowledge = async (
    filters: KnowledgeFilters,
    page: number
): Promise<PageResult<KnowledgeDocument>> => {
    const query = new URLSearchParams({
        ...filters,
        page: String(page),
        pageSize: String(KNOWLEDGE_PAGE_SIZE),
    }).toString();
    return readPage<KnowledgeDocument>(`/knowledge?${query}`);
};

export const saveKnowledge = async (input: Partial<KnowledgeDocument>, id?: string) =>
    id ? $apiPrivate.patch(`/knowledge/${id}`, input) : $apiPrivate.post('/knowledge', input);

export const deleteKnowledge = async (id: string) => $apiPrivate.delete(`/knowledge/${id}`);
