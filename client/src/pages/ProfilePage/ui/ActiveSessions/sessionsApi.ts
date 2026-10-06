import { $apiPrivate } from '@/shared/api/api';
import { SessionItem } from './ActiveSessionItem';

export const fetchSessionsApi = async (): Promise<SessionItem[]> => {
    const { data } = await $apiPrivate.get<{ data: SessionItem[] }>('/profile/sessions');
    return data.data;
};

export const revokeSessionApi = (id: number) => $apiPrivate.delete(`/profile/sessions/${id}`);

export const revokeAllSessionsApi = () => $apiPrivate.delete('/profile/sessions');
