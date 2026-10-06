import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { Choreographer } from '../ChoreographerCard/ChoreographerCard';

export const useChoreographersPage = () => {
    const [searchParams] = useSearchParams();
    const [choreographers, setChoreographers] = useState<Choreographer[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editChoreographer, setEditChoreographer] = useState<Choreographer | null>(null);

    const fetchChoreographers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await $apiPrivate.get<Choreographer[]>('/schedule/choreographers');
            setChoreographers(res.data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchChoreographers(); }, [fetchChoreographers]);

    const onAdd = useCallback(() => setModalOpen(true), []);
    const onEdit = useCallback((c: Choreographer) => { setEditChoreographer(c); setModalOpen(true); }, []);
    const onClose = useCallback(() => { setModalOpen(false); setEditChoreographer(null); }, []);

    const query = (searchParams.get('_q') ?? '').trim().toLowerCase();
    const filteredChoreographers = useMemo(() => choreographers.filter((choreographer) => (
        !query || `${choreographer.firstName} ${choreographer.lastName}`.toLowerCase().includes(query)
    )), [choreographers, query]);

    const onDelete = useCallback(async (id: number) => {
        if (!window.confirm('Удалить хореографа?')) return;
        try {
            await $apiPrivate.delete(`/schedule/choreographers/${id}`);
            toast.success('Удалён');
            fetchChoreographers();
        } catch {
            toast.error('Не удалось удалить');
        }
    }, [fetchChoreographers]);

    return {
        loading, modalOpen, editChoreographer, filteredChoreographers,
        fetchChoreographers, onAdd, onEdit, onClose, onDelete,
    };
};
