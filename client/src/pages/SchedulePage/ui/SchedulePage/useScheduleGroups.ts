import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { DanceGroup, DanceGroupsResponse } from '@/entities/DanceGroup';

export const useScheduleGroups = () => {
    const [groups, setGroups] = useState<DanceGroup[]>([]);
    const [loading, setLoading] = useState(false);

    const loadGroups = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await $apiPrivate.get<DanceGroupsResponse>('/schedule/groups', {
                params: { page: 1, limit: 500 },
            });
            setGroups(data.data);
        } catch {
            toast.error('Не удалось загрузить расписание');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadGroups(); }, [loadGroups]);

    return { groups, loading };
};