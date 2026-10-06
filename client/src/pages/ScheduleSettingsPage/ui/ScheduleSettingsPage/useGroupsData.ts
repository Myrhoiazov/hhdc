import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { DanceGroup, DanceGroupsResponse, GroupManagementStatistics } from '@/entities/DanceGroup';

const buildGroupsParams = (filterStyle: string, filterChoreographer: string, filterLevel: string) => {
    const params: Record<string, string> = {};
    if (filterStyle) params.style = filterStyle;
    if (filterChoreographer) params.choreographerId = filterChoreographer;
    if (filterLevel) params.level = filterLevel;
    return params;
};

export const useGroupsData = (filterStyle: string, filterChoreographer: string, filterLevel: string) => {
    const [groups, setGroups] = useState<DanceGroup[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [statistics, setStatistics] = useState<GroupManagementStatistics | null>(null);

    const fetchGroups = useCallback(async () => {
        setLoading(true);
        try {
            const res = await $apiPrivate.get<DanceGroupsResponse>('/schedule/groups', {
                params: buildGroupsParams(filterStyle, filterChoreographer, filterLevel),
            });
            setGroups(res.data.data);
            setTotal(res.data.total);
        } finally {
            setLoading(false);
        }
    }, [filterStyle, filterChoreographer, filterLevel]);

    const fetchStatistics = useCallback(async () => {
        const res = await $apiPrivate.get<GroupManagementStatistics>('/schedule/groups-management/stats');
        setStatistics(res.data);
    }, []);

    useEffect(() => { fetchGroups(); }, [fetchGroups]);
    useEffect(() => { fetchStatistics(); }, [fetchStatistics]);

    const onSaved = useCallback(() => {
        fetchGroups();
        fetchStatistics();
    }, [fetchGroups, fetchStatistics]);

    const onDeleteGroup = useCallback(async (id: number) => {
        if (!window.confirm('Удалить группу?')) return;
        try {
            await $apiPrivate.delete(`/schedule/groups/${id}`);
            toast.success('Группа удалена');
            onSaved();
        } catch {
            toast.error('Не удалось удалить группу');
        }
    }, [onSaved]);

    return {
        groups, total, loading, statistics, onDeleteGroup, onSaved,
    };
};
