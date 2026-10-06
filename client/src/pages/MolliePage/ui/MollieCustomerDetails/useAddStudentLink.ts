import { Dispatch, SetStateAction } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { MollieClient, MollieClientStudentLink } from '@/entities/MollieClient';
import { PayerRelation } from './studentLinksHelpers';

export const useAddStudentLink = (
    customerId: string,
    clientLinks: MollieClientStudentLink[],
    setClientLinks: Dispatch<SetStateAction<MollieClientStudentLink[]>>,
    setIsSaving: (value: boolean) => void,
    onChanged: () => void,
) => async (selectedClientId: string, payerRelation: PayerRelation, onSaved: () => void) => {
    if (!selectedClientId) {
        toast.error('Выберите ученика');
        return;
    }

    setIsSaving(true);
    try {
        // The create endpoint still returns the full customer payload — only
        // clientLinks from it is relevant here.
        const { data } = await $apiPrivate.post<MollieClient>(
            `/mollie/customers/${customerId}/student-links`,
            {
                clientId: selectedClientId,
                payerRelation,
                isPrimary: !clientLinks.length,
            },
        );
        setClientLinks(data.clientLinks ?? []);
        onSaved();
        onChanged();
        toast.success('Ученик привязан к платёжному профилю');
    } catch {
        toast.error('Не удалось привязать ученика');
    } finally {
        setIsSaving(false);
    }
};
