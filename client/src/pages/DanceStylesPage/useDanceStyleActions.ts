import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { DanceStyle } from './danceStyleTypes';

export const useDanceStyleActions = (loadStyles: () => Promise<void>) => {
    const remove = async (item: DanceStyle) => {
        if (!window.confirm(`Удалить стиль «${item.name}»?`)) return;
        try {
            await $apiPrivate.delete(`/schedule/style-cards/${item.id}`);
            toast.success('Стиль удалён');
            loadStyles();
        } catch {
            toast.error('Не удалось удалить стиль');
        }
    };

    const toggle = async (item: DanceStyle) => {
        await $apiPrivate.put(`/schedule/style-cards/${item.id}`, { ...item, isActive: !item.isActive });
        loadStyles();
    };

    return { remove, toggle };
};
