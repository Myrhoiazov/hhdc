import { useCallback } from 'react';
import { $apiPrivate } from '@/shared/api/api';
import { MollieSubscription } from '@/entities/MollieSubscription';
import { runSubscriptionMutation } from './subscriptionMutation';
import { SubscriptionFormState } from './useSubscriptionForm';
import { useCancelSubscription } from './useCancelSubscription';

export interface SubscriptionMutationsParams {
    customerId: string;
    subscription: MollieSubscription;
    form: SubscriptionFormState;
    restartDate: string;
    setIsSaving: (value: boolean) => void;
    finishModal: () => void;
    reloadPage: (() => void) | undefined;
}

export const useSubscriptionMutations = ({
    customerId, subscription, form, restartDate, setIsSaving, finishModal, reloadPage,
}: SubscriptionMutationsParams) => {
    const onCancel = useCancelSubscription(customerId, subscription, setIsSaving, finishModal, reloadPage);

    const onUpdate = useCallback(async () => {
        if (!subscription.id || !form.mandateId) return;
        await runSubscriptionMutation({
            setIsSaving,
            closeModal: finishModal,
            reloadPage,
            action: () => $apiPrivate.patch(`/mollie/subscriptions/${subscription.id}`, {
                customerId: Number(customerId),
                mandateId: form.mandateId,
                amountValue: Number(form.amountValue),
                interval: form.interval,
                startDate: form.startDate,
                description: form.description,
                times: form.times ? Number(form.times) : undefined,
            }),
            successMessage: 'Подписка обновлена. При изменении даты Mollie создаёт новую подписку.',
            fallbackErrorMessage: 'Не удалось обновить подписку',
        });
    }, [customerId, form, reloadPage, subscription.id, finishModal, setIsSaving]);

    const onRestart = useCallback(async () => {
        if (!subscription.id || !form.mandateId) return;
        await runSubscriptionMutation({
            setIsSaving,
            closeModal: finishModal,
            reloadPage,
            action: () => $apiPrivate.post(`/mollie/subscriptions/${subscription.id}/restart`, {
                customerId: Number(customerId),
                mandateId: form.mandateId,
                startDate: restartDate,
            }),
            successMessage: 'Новая подписка создана',
            fallbackErrorMessage: 'Не удалось повторно запустить подписку',
        });
    }, [customerId, form.mandateId, reloadPage, restartDate, subscription.id, finishModal, setIsSaving]);

    return { onCancel, onUpdate, onRestart };
};
