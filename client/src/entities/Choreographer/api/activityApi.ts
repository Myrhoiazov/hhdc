import { readData } from '@/shared/api/request';
import { ChoreographerActivityPage } from '../model/activity';

export const listChoreographerActivity = async (
    personId: string,
    filters: { type?: string; before?: string } = {}
) => {
    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.before) params.set('before', filters.before);
    return readData<ChoreographerActivityPage>(`/choreographers/${personId}/activity?${params}`);
};
