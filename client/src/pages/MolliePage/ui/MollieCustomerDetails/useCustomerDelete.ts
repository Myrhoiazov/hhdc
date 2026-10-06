import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DELETE_MOLLIE_CLIENT_HAS_DEPENDENCIES, deleteMollieClientById } from '@/features/editMollieClientDropdown';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';

const CUSTOMERS_LIST_ROUTE = '/mollie/customers';

const getDeleteErrorMessage = (reason: unknown) => (
    reason === DELETE_MOLLIE_CLIENT_HAS_DEPENDENCIES
        ? 'Нельзя удалить: у клиента есть действующие мандаты или подписки'
        : 'Не удалось удалить клиента Mollie'
);

export const useCustomerDelete = (customerId: string | undefined) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const onOpenDeleteModal = useCallback(() => setIsDeleteModalOpen(true), []);
    const onCloseDeleteModal = useCallback(() => setIsDeleteModalOpen(false), []);

    const onConfirmDelete = useCallback(async () => {
        if (!customerId) return;
        setIsDeleting(true);
        const result = await dispatch(deleteMollieClientById(customerId));
        setIsDeleting(false);
        setIsDeleteModalOpen(false);

        if (result.meta.requestStatus !== 'fulfilled') {
            toast.error(getDeleteErrorMessage(result.payload));
            return;
        }
        toast.success('Клиент Mollie удалён');
        navigate(CUSTOMERS_LIST_ROUTE);
    }, [customerId, dispatch, navigate]);

    return {
        isDeleteModalOpen, isDeleting, onOpenDeleteModal, onCloseDeleteModal, onConfirmDelete,
    };
};
