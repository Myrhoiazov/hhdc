import { useCallback } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { $apiPrivate } from '@/shared/api/api';
import type { SelectOption } from '@/shared/ui/Select/Select';
import { today } from './helpers';
import type { ClientSubscription, PaymentCustomer } from './types';
import type { RestartForm } from './useClientPaymentBlock';

export const useSubscriptionRestartActions = (
    reload: () => void,
    setIsSaving: (saving: boolean) => void,
    getMandateOptionsForCustomer: (customer?: PaymentCustomer | null) => SelectOption<string>[],
    setRestartingSubscription: (subscription: ClientSubscription | null) => void,
    setRestartForm: (form: RestartForm) => void,
) => {
    const onOpenRestartSubscription = useCallback((subscription: ClientSubscription) => {
        setRestartingSubscription(subscription);
        setRestartForm({
            mandateId: getMandateOptionsForCustomer(subscription.customer)[0]?.value ?? '',
            startDate: today,
        });
    }, [getMandateOptionsForCustomer, setRestartingSubscription, setRestartForm]);

    const onRestartSubscription = useCallback(async (subscription: ClientSubscription, form: RestartForm) => {
        if (!subscription.mollieId || !subscription.customer?.id || !form.mandateId) {
            toast.error('Для повторного запуска нужен valid mandate');
            return;
        }

        setIsSaving(true);
        try {
            await $apiPrivate.post(`/mollie/subscriptions/${subscription.mollieId}/restart`, {
                customerId: subscription.customer.id,
                mandateId: form.mandateId,
                startDate: form.startDate,
            });
            toast.success('Создана новая активная подписка');
            setRestartingSubscription(null);
            reload();
        } catch (error) {
            const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined;
            toast.error(detail || 'Не удалось повторно запустить подписку');
        } finally {
            setIsSaving(false);
        }
    }, [reload, setIsSaving, setRestartingSubscription]);

    return { onOpenRestartSubscription, onRestartSubscription };
};
