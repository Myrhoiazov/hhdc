import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { Choreographer, ChoreographerCategory } from '../ChoreographerCard/ChoreographerCard';

export type ChoreographerFormValues = {
    firstNameRu: string; lastNameRu: string;
    firstNameUa: string; lastNameUa: string;
    firstNameEn: string; lastNameEn: string;
    phone: string; email: string; birthday: string; experience: string;
    category: ChoreographerCategory | '';
    photo: string | null; mainPhoto: string | null; additionalPhotos: string[];
    description: string; templateDescription: string; showOnSite: boolean;
};

const buildChoreographerPayload = (values: ChoreographerFormValues) => ({
    firstName: values.firstNameRu, lastName: values.lastNameRu,
    firstNameUa: values.firstNameUa || null, lastNameUa: values.lastNameUa || null,
    firstNameEn: values.firstNameEn || null, lastNameEn: values.lastNameEn || null,
    phone: values.phone || null, email: values.email || null,
    birthday: values.birthday || null,
    experience: values.experience ? Number(values.experience) : null,
    category: values.category || null,
    photo: values.photo, mainPhoto: values.mainPhoto,
    additionalPhotos: values.additionalPhotos.length ? values.additionalPhotos : null,
    description: values.description || null,
    templateDescription: values.templateDescription || null,
    showOnSite: values.showOnSite,
});

export const useChoreographerSubmit = (
    values: ChoreographerFormValues,
    editChoreographer: Choreographer | null | undefined,
    onSaved: () => void,
    onClose: () => void,
) => {
    const [saving, setSaving] = useState(false);

    const onSubmit = useCallback(async () => {
        if (!values.firstNameRu || !values.lastNameRu) {
            toast.error('Укажите имя и фамилию (RU)');
            return;
        }
        setSaving(true);
        try {
            const payload = buildChoreographerPayload(values);
            if (editChoreographer) {
                await $apiPrivate.put(`/schedule/choreographers/${editChoreographer.id}`, payload);
                toast.success('Хореограф обновлён');
            } else {
                await $apiPrivate.post('/schedule/choreographers', payload);
                toast.success('Хореограф создан');
            }
            onSaved();
            onClose();
        } catch {
            toast.error('Не удалось сохранить');
        } finally {
            setSaving(false);
        }
    }, [values, editChoreographer, onSaved, onClose]);

    return { saving, onSubmit };
};
