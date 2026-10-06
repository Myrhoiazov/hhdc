import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import type { ClientPaymentSummary, ClientSubscription } from './types';
import type { SubscriptionForm } from './useClientPaymentBlock';

export const useSubscriptionCreateActions = (
    data: ClientPaymentSummary | null, reload: () => void,
    setIsSaving: (saving: boolean) => void, setIsSubscriptionOpen: (open: boolean) => void,
) => {
    const onCreateSubscription = useCallback(async (form: SubscriptionForm) => {
        const payer = data?.payers.find((item) => String(item.customer?.id) === form.customerId)?.customer;
        const amount = Number(form.amountValue);
        if (!payer?.mollieId || !form.mandateId || !Number.isFinite(amount) || amount <= 0 || !form.description.trim()) {
            toast.error('Заполните плательщика, valid mandate, сумму и описание');
            return;
        }
        setIsSaving(true);
        try {
            await $apiPrivate.post(`/mollie/mandates/${payer.mollieId}/subscriptions`, {
                customerId: payer.mollieId,
                mandateId: form.mandateId,
                amount: { currency: 'EUR', value: amount.toFixed(2) },
                interval: form.interval.trim(),
                startDate: form.startDate,
                description: form.description.trim(),
            });
            toast.success('Подписка создана');
            setIsSubscriptionOpen(false);
            reload();
        } catch {
            toast.error('Не удалось создать подписку. Проверьте mandate и дату начала.');
        } finally {
            setIsSaving(false);
        }
    }, [data?.payers, reload, setIsSaving, setIsSubscriptionOpen]);

    const onCancelSubscription = useCallback(async (subscription: ClientSubscription) => {
        if (!subscription.mollieId || !subscription.customer?.id
            || !window.confirm('Остановить активную подписку в Mollie?')) return;
        try {
            await $apiPrivate.delete(`/mollie/subscriptions/${subscription.mollieId}`, {
                data: { customerId: subscription.customer.id },
            });
            toast.success('Подписка остановлена');
            reload();
        } catch {
            toast.error('Не удалось остановить подписку');
        }
    }, [reload]);

    return { onCreateSubscription, onCancelSubscription };
};
