import { useCallback, useState } from 'react';

export type ModalKind = 'cancel' | 'edit' | 'restart';

export const useSubscriptionModal = () => {
    const [modal, setModal] = useState<ModalKind>();
    const [isSaving, setIsSaving] = useState(false);

    const closeModal = useCallback(() => {
        if (!isSaving) setModal(undefined);
    }, [isSaving]);

    const finishModal = useCallback(() => setModal(undefined), []);

    return {
        modal, setModal, isSaving, setIsSaving, closeModal, finishModal,
    };
};
