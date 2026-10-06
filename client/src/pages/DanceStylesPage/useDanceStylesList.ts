import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useSearchParams } from 'react-router-dom';
import { $apiPrivate } from '@/shared/api/api';
import { DanceStyle } from './danceStyleTypes';

export const useDanceStylesList = () => {
    const [searchParams] = useSearchParams();
    const [items, setItems] = useState<DanceStyle[]>([]);
    const [search, setSearch] = useState(searchParams.get('_q') ?? '');
    const [status, setStatus] = useState('all');
    const [sort, setSort] = useState('name-asc');
    const [loading, setLoading] = useState(false);

    const loadStyles = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await $apiPrivate.get<{ items: DanceStyle[] }>('/schedule/style-cards', {
                params: { _q: search, status, sort },
            });
            setItems(data.items);
        } catch {
            toast.error('Не удалось загрузить стили');
        } finally {
            setLoading(false);
        }
    }, [search, status, sort]);

    useEffect(() => {
        const timer = window.setTimeout(loadStyles, 250);
        return () => window.clearTimeout(timer);
    }, [loadStyles]);

    useEffect(() => {
        setSearch(searchParams.get('_q') ?? '');
    }, [searchParams]);

    const resetFilters = () => {
        setSearch('');
        setStatus('all');
        setSort('name-asc');
    };

    return {
        items, search, setSearch, status, setStatus, sort, setSort, loading, loadStyles, resetFilters,
    };
};
