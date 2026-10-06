import { useCallback, useState } from 'react';
import { DanceGroup } from '@/entities/DanceGroup';

export const useGroupModal = () => {
    const [createOpen, setCreateOpen] = useState(false);
    const [editGroup, setEditGroup] = useState<DanceGroup | null>(null);

    const onEdit = useCallback((group: DanceGroup) => {
        setEditGroup(group);
        setCreateOpen(true);
    }, []);

    const onCloseCreate = useCallback(() => {
        setCreateOpen(false);
        setEditGroup(null);
    }, []);

    return {
        createOpen, setCreateOpen, editGroup, onEdit, onCloseCreate,
    };
};
