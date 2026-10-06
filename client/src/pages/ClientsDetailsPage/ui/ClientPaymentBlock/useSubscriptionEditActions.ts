import { useCallback } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { $apiPrivate } from '@/shared/api/api';
import type { SelectOption } from '@/shared/ui/Select/Select';
import { today } from './helpers';
import type { ClientSubscription, PaymentCustomer } from './types';
import type { EditSubscriptionForm } from './useClientPaymentBlock';

export const useSubscriptionEditActions = (
    reload: () => void,
    setIsSaving: (saving: boolean) => void,
    getMandateOptionsForCustomer: (customer?: PaymentCustomer | null) => SelectOption<string>[],
    setEditingSubscription: (subscription: ClientSubscription | null) => void,
    setEditSubscriptionForm: (form: EditSubscriptionForm) => void,
) => {
    const onOpenEditSubscription = useCallback((subscription: ClientSubscription) => {
        setEditingSubscription(subscription);
        setEditSubscriptionForm({
            mandateId: subscription.mandate?.mollieId ?? getMandateOptionsForCustomer(subscription.customer)[0]?.value ?? '',
            amountValue: String(subscription.amountValue ?? ''),
            interval: subscription.interval ?? '1 month',
            startDate: subscription.nextPaymentDate?.slice(0, 10) ?? today,
            description: subscription.description ?? '',
            times: subscription.times ? String(subscription.times) : '',
        });
    }, [getMandateOptionsForCustomer, setEditingSubscription, setEditSubscriptionForm]);

    const onUpdateSubscription = useCallback(async (subscription: ClientSubscription, form: EditSubscriptionForm) => {
        if (!subscription.mollieId || !subscription.customer?.id || !form.mandateId) return;

        setIsSaving(true);
        try {
            await $apiPrivate.patch(`/mollie/subscriptions/${subscription.mollieId}`, {
                customerId: subscription.customer.id,
                mandateId: form.mandateId,
                amountValue: Number(form.amountValue),
                interval: form.interval.trim(),
                startDate: form.startDate,
                description: form.description.trim(),
                times: form.times ? Number(form.times) : undefined,
            });
            toast.success('Подписка обновлена. При изменении даты Mollie создаёт новую подписку.');
            setEditingSubscription(null);
            reload();
        } catch (error) {
            const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined;
            toast.error(detail || 'Не удалось обновить активную подписку');
        } finally {
            setIsSaving(false);
        }
    }, [reload, setIsSaving, setEditingSubscription]);

    return { onOpenEditSubscription, onUpdateSubscription };
};
