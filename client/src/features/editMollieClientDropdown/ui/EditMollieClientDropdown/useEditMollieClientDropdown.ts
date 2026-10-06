import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { getRouteMollieDetails } from '@/shared/const/router';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { deleteMollieClientById } from '../../model/services/deleteMollieClientById';
import { fetchMollieClientData } from '../../model/services/fetchMollieClientData/fetchMollieClientData';

export const useEditMollieClientDropdown = (clientId: string, reloadPage?: () => void) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const dispatch = useAppDispatch();

    const deleteClientGandler = useCallback(async () => {
        const result = await dispatch(deleteMollieClientById(clientId));
        if (result.meta.requestStatus === 'fulfilled') {
            reloadPage?.();
            toast.info('Клиент успешно удален');
        }
    }, [dispatch, clientId, reloadPage]);

    const setIsModalOpenHandle = useCallback(async () => {
        setIsModalOpen(true);
        dispatch(fetchMollieClientData(clientId));
    }, [dispatch, clientId]);

    const setIsModalCloseHandle = useCallback(async () => {
        setIsModalOpen(false);
    }, []);

    const items = [
        { content: 'Просмотреть', href: getRouteMollieDetails(String(clientId)) },
        { content: 'Обновить', onClick: setIsModalOpenHandle },
        { content: 'Удалить', onClick: deleteClientGandler },
    ];

    return { isModalOpen, items, setIsModalCloseHandle };
};
