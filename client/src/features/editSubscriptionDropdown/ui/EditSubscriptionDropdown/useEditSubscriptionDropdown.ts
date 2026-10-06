import { useCallback, useMemo } from 'react';
import { MollieSubscription } from '@/entities/MollieSubscription';
import { Mandate } from '@/entities/Mandate';
import { useSubscriptionModal, ModalKind } from './useSubscriptionModal';
import { useValidMandateOptions } from './useValidMandateOptions';
import { useSubscriptionForm } from './useSubscriptionForm';
import { useSubscriptionMutations } from './useSubscriptionMutations';
import { buildDropdownItems } from './subscriptionDropdownItems';
import { today } from './subscriptionDropdownConst';

export type { SubscriptionFormState } from './useSubscriptionForm';

export const useEditSubscriptionDropdown = (
    customerId: string,
    subscription: MollieSubscription,
    mandates: Mandate[],
    reloadPage?: () => void,
) => {
    const {
        modal, setModal, isSaving, setIsSaving, closeModal, finishModal,
    } = useSubscriptionModal();

    const validMandateOptions = useValidMandateOptions(mandates);

    const { form, setForm, restartDate, setRestartDate } = useSubscriptionForm(
        subscription, validMandateOptions[0]?.value ?? '',
    );

    const { onCancel, onUpdate, onRestart } = useSubscriptionMutations({
        customerId, subscription, form, restartDate, setIsSaving, finishModal, reloadPage,
    });

    const openModal = useCallback((nextModal: ModalKind) => {
        if (!form.mandateId && validMandateOptions[0]?.value) {
            setForm((prev) => ({ ...prev, mandateId: validMandateOptions[0].value }));
        }
        setModal(nextModal);
    }, [form.mandateId, validMandateOptions, setForm, setModal]);

    const items = useMemo(
        () => buildDropdownItems(subscription.status, openModal),
        [subscription.status, openModal],
    );

    return {
        modal,
        isSaving,
        validMandateOptions,
        form,
        setForm,
        restartDate,
        setRestartDate,
        closeModal,
        setModal,
        items,
        today,
        onCancel,
        onUpdate,
        onRestart,
    };
};
