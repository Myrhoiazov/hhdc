import { useCallback, useEffect, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';
import { toast } from 'react-toastify';
import { Branch } from '../BranchCard/BranchCard';

export const useBranches = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editBranch, setEditBranch] = useState<Branch | null>(null);

    const fetchBranches = useCallback(async () => {
        setLoading(true);
        try {
            const res = await $apiPrivate.get<Branch[]>('/company/branches');
            setBranches(res.data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchBranches(); }, [fetchBranches]);

    const onDelete = async (id: number) => {
        if (!window.confirm('Удалить филиал?')) return;
        try {
            await $apiPrivate.delete(`/company/branches/${id}`);
            toast.success('Филиал удалён');
            fetchBranches();
        } catch {
            toast.error('Не удалось удалить филиал');
        }
    };

    const onEdit = (branch: Branch) => {
        setEditBranch(branch);
        setModalOpen(true);
    };

    const onClose = () => {
        setModalOpen(false);
        setEditBranch(null);
    };

    const openCreate = () => {
        setEditBranch(null);
        setModalOpen(true);
    };

    return { branches, loading, modalOpen, editBranch, fetchBranches, onDelete, onEdit, onClose, openCreate };
};