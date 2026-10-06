import { useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import type { DanceGroup } from '@/entities/DanceGroup';
import { GroupLevel, ScheduleSlot } from '@/entities/DanceGroup';

export interface GroupFormValues {
    name: string;
    style: string;
    level: GroupLevel;
    maxParticipants: number;
    lessonPrice: string;
    choreographerId: string;
    branchId: string;
    slots: ScheduleSlot[];
}

export const useGroupFormSubmit = (
    values: GroupFormValues,
    editGroup: DanceGroup | null | undefined,
    onSaved: () => void,
    onClose: () => void,
) => {
    const [saving, setSaving] = useState(false);

    const onSubmit = async () => {
        const {
            name, style, choreographerId, branchId, level, maxParticipants, lessonPrice, slots,
        } = values;

        if (!name || !style || !choreographerId || !branchId) {
            toast.error('Заполните все обязательные поля');
            return;
        }

        const parsedLessonPrice = Number(lessonPrice);
        if (!Number.isFinite(parsedLessonPrice) || parsedLessonPrice < 0) {
            toast.error('Укажите корректную стоимость занятия');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name, style, level, maxParticipants, lessonPriceCents: Math.round(parsedLessonPrice * 100), choreographerId, branchId, slots,
            };
            if (editGroup) {
                await $apiPrivate.put(`/schedule/groups/${editGroup.id}`, payload);
                toast.success('Группа обновлена');
            } else {
                await $apiPrivate.post('/schedule/groups', payload);
                toast.success('Группа создана');
            }
            onSaved();
            onClose();
        } catch {
            toast.error('Не удалось сохранить группу');
        } finally {
            setSaving(false);
        }
    };

    return { saving, onSubmit };
};
