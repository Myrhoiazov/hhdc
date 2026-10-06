import { useState } from 'react';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { fetchMollieClientData } from '@/features/editMollieClientDropdown';
import { useCustomerDataRefresh } from './useCustomerDataRefresh';
import { useMandateRevoke } from './useMandateRevoke';
import { hasDeleteBlockingDependencies } from './customerDeleteGuard';

export const useMollieCustomerDetails = (customerId: string | undefined) => {
    const dispatch = useAppDispatch();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const {
        mandates, subscriptions, isLoading, detailsVersion, onReloadCustomerDetails,
    } = useCustomerDataRefresh(customerId);

    const onRevokeMandate = useMandateRevoke(customerId, onReloadCustomerDetails);

    const onOpenEditModal = async () => {
        if (!customerId) return;
        setIsEditModalOpen(true);
        dispatch(fetchMollieClientData(customerId));
    };

    const onCloseEditModal = () => {
        setIsEditModalOpen(false);
    };

    const canDelete = !isLoading && !hasDeleteBlockingDependencies(mandates, subscriptions);

    return {
        mandates,
        subscriptions,
        isLoading,
        isEditModalOpen,
        canDelete,
        detailsVersion,
        onOpenEditModal,
        onCloseEditModal,
        onReloadCustomerDetails,
        onRevokeMandate,
    };
};
