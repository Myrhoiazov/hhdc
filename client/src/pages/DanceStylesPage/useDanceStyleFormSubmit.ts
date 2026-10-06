import { ChangeEvent, useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { StyleForm } from './danceStyleTypes';

export const useDanceStyleFormSubmit = (
    form: StyleForm,
    updateField: (field: keyof StyleForm, value: string | boolean) => void,
    editingId: number | undefined,
    setModalOpen: (open: boolean) => void,
    loadStyles: () => Promise<void>,
) => {
    const [saving, setSaving] = useState(false);

    const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const data = new FormData();
        data.append('file', file);
        try {
            const response = await $apiPrivate.post<{ url: string }>('/schedule/style-cards/upload', data);
            updateField('image', response.data.url);
        } catch {
            toast.error('Не удалось загрузить фото');
        }
    };

    const save = async () => {
        if (!form.name.trim()) {
            toast.error('Укажите название на русском');
            return;
        }
        setSaving(true);
        try {
            if (editingId) await $apiPrivate.put(`/schedule/style-cards/${editingId}`, form);
            else await $apiPrivate.post('/schedule/style-cards', form);
            toast.success(editingId ? 'Стиль обновлён' : 'Стиль добавлен');
            setModalOpen(false);
            loadStyles();
        } catch {
            toast.error('Не удалось сохранить стиль');
        } finally {
            setSaving(false);
        }
    };

    return { saving, uploadImage, save };
};
