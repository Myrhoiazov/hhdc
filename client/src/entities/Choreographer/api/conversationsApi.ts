import { $apiPrivate } from '@/shared/api/api';
import { deleteData, postData } from '@/shared/api/request';
import { ChoreographerThread, ChoreographerThreads } from '../model/conversations';

export const listChoreographerThreads = async (
    personId: string,
    q = '',
    page = 1
): Promise<ChoreographerThreads> => {
    const params = new URLSearchParams({ page: String(page) });
    if (q.trim()) params.set('q', q.trim());
    const result = (
        await $apiPrivate.get<{
            data: ChoreographerThread[];
            candidates: ChoreographerThread[];
            meta: { total: number };
        }>(`/choreographers/${personId}/conversations?${params}`)
    ).data;
    return { data: result.data, candidates: result.candidates, total: result.meta.total };
};

// A link is always explicit and carries the reason; the conversation itself is not changed.
export const linkChoreographerThread = async (
    personId: string,
    conversationId: string,
    note: string
) =>
    postData<{ id: string }>(`/choreographers/${personId}/conversations/${conversationId}/link`, {
        note,
    });

export const unlinkChoreographerThread = async (
    personId: string,
    conversationId: string,
    note: string
) =>
    deleteData<{ unlinked: boolean }>(
        `/choreographers/${personId}/conversations/${conversationId}/link`,
        { data: { note } }
    );
