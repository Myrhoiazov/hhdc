import { Dispatch, SetStateAction } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { MollieClient, MollieClientStudentLink } from '@/entities/MollieClient';

export const useDeleteStudentLink = (
    customerId: string,
    setClientLinks: Dispatch<SetStateAction<MollieClientStudentLink[]>>,
    setIsSaving: (value: boolean) => void,
    onChanged: () => void,
) => async (linkId: string | number) => {
    if (!window.confirm('Удалить связь ученика с платёжным профилем?')) {
        return;
    }

    setIsSaving(true);
    try {
        // The delete endpoint still returns the full customer payload — only
        // clientLinks from it is relevant here.
        const { data } = await $apiPrivate.delete<MollieClient>(
            `/mollie/customers/${customerId}/student-links/${linkId}`,
        );
        setClientLinks(data.clientLinks ?? []);
        onChanged();
        toast.success('Связь удалена');
    } catch {
        toast.error('Не удалось удалить связь');
    } finally {
        setIsSaving(false);
    }
};
