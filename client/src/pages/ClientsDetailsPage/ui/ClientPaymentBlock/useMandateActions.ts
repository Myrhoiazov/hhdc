import { useCallback } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { $apiPrivate } from '@/shared/api/api';
import type { ClientMandate, ClientPaymentSummary } from './types';
import type { MandateForm } from './useClientPaymentBlock';

export const useMandateActions = (
    data: ClientPaymentSummary | null,
    reload: () => void,
    setIsSaving: (saving: boolean) => void,
    setIsMandateOpen: (open: boolean) => void,
) => {
    const onCreateMandate = useCallback(async (form: MandateForm) => {
        const payer = data?.payers.find((item) => String(item.customer?.id) === form.customerId)?.customer;
        if (!payer?.mollieId || !form.consumerName.trim() || !form.consumerAccount.trim()) {
            toast.error('Выберите плательщика и заполните имя владельца и IBAN');
            return;
        }

        setIsSaving(true);
        try {
            await $apiPrivate.post('/mollie/mandates', {
                customerId: payer.mollieId,
                consumerName: form.consumerName.trim(),
                consumerAccount: form.consumerAccount.replace(/\s/g, '').toUpperCase(),
                consumerBic: form.consumerBic.trim() || undefined,
                signatureDate: form.signatureDate,
                method: 'directdebit',
            });
            toast.success('Mandate создан');
            setIsMandateOpen(false);
            reload();
        } catch {
            toast.error('Не удалось создать mandate. Проверьте IBAN и данные плательщика.');
        } finally {
            setIsSaving(false);
        }
    }, [data?.payers, reload, setIsSaving, setIsMandateOpen]);

    const onRevokeMandate = useCallback(async (mandate: ClientMandate) => {
        if (!mandate.mollieId || !mandate.customer?.id
            || !window.confirm('Отозвать mandate? Mollie немедленно отменит все связанные активные подписки. Действие необратимо.')) return;

        try {
            await $apiPrivate.delete(`/mollie/customers/${mandate.customer.id}/mandates/${mandate.mollieId}`);
            toast.success('Mandate отозван, связанные подписки остановлены');
            reload();
        } catch (error) {
            const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined;
            toast.error(detail || 'Не удалось отозвать mandate');
        }
    }, [reload]);

    return { onCreateMandate, onRevokeMandate };
};
