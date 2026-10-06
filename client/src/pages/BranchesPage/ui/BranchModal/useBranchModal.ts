import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import type { Branch } from '../BranchCard/BranchCard';

interface UseBranchModalParams {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    editBranch?: Branch | null;
}

const emptyBranch = { name: '', city: '', address: '', phone: '', email: '', description: '', isActive: true };

export const useBranchModal = ({ isOpen, onClose, onSaved, editBranch }: UseBranchModalParams) => {
    const [form, setForm] = useState(emptyBranch);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setForm(editBranch ? {
            name: editBranch.name, city: editBranch.city ?? '', address: editBranch.address ?? '',
            phone: editBranch.phone ?? '', email: editBranch.email ?? '',
            description: editBranch.description ?? '', isActive: editBranch.isActive,
        } : emptyBranch);
    }, [editBranch, isOpen]);

    const updateField = <Key extends keyof typeof form>(key: Key, value: typeof form[Key]) => {
        setForm((current) => ({ ...current, [key]: value }));
    };

    const onSubmit = async () => {
        if (!form.name) {
            toast.error('Введите название филиала');
            return;
        }

        setSaving(true);
        try {
            if (editBranch) {
                await $apiPrivate.put(`/company/branches/${editBranch.id}`, form);
                toast.success('Филиал обновлён');
            } else {
                await $apiPrivate.post('/company/branches', form);
                toast.success('Филиал создан');
            }
            onSaved();
            onClose();
        } catch {
            toast.error('Не удалось сохранить филиал');
        } finally {
            setSaving(false);
        }
    };

    return { form, saving, updateField, onSubmit };
};
