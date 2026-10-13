import { PageResult, patchData, postData, readData, readPage } from '@/shared/api/request';
import {
    ChoreographerListItem,
    ChoreographerDetail,
    ChoreographerProfileInput,
    ChoreographerFilters,
    CHOREOGRAPHER_PAGE_SIZE,
} from '../model/profile';

export const listChoreographers = async (
    filters: ChoreographerFilters = {},
    page = 1
): Promise<PageResult<ChoreographerListItem>> => {
    const params = new URLSearchParams({
        page: String(page),
        pageSize: String(CHOREOGRAPHER_PAGE_SIZE),
    });
    if (filters.q?.trim()) params.set('q', filters.q.trim());
    if (filters.relationshipStatus) params.set('relationshipStatus', filters.relationshipStatus);
    return readPage<ChoreographerListItem>(`/choreographers?${params}`);
};

export const getChoreographer = async (personId: string) =>
    readData<ChoreographerDetail>(`/choreographers/${personId}`);

// Turns an existing person into a choreographer; calling it again for the same person is harmless.
export const createChoreographer = async (
    personId: string,
    profile: ChoreographerProfileInput = {}
) => postData<ChoreographerDetail>('/choreographers', { personId, ...profile });

export const updateChoreographer = async (personId: string, profile: ChoreographerProfileInput) =>
    patchData<ChoreographerDetail>(`/choreographers/${personId}`, profile);
