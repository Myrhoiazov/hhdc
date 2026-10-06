import { $apiPrivate } from '@/shared/api/api';
import { GlobalSearchResponse } from '../../types/globalSearch';

export const fetchGlobalSearch = async (query: string, signal?: AbortSignal): Promise<GlobalSearchResponse> => {
    const response = await $apiPrivate.get<GlobalSearchResponse>('/search', {
        params: { q: query },
        signal,
    });

    return response.data;
};
