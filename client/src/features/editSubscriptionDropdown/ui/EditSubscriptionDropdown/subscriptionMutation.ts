import { toast } from 'react-toastify';
import axios from 'axios';

export const extractApiErrorDetail = (error: unknown, fallback: string): string => {
    const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined;
    return detail || fallback;
};

export interface SubscriptionMutationOptions {
    setIsSaving: (value: boolean) => void;
    closeModal: () => void;
    reloadPage: (() => void) | undefined;
    action: () => Promise<void>;
    successMessage: string;
    fallbackErrorMessage: string;
}

// Shared by update/restart below — both save, close the modal, reload the
// page and toast on success/failure; only the request and the copy differ.
export const runSubscriptionMutation = async ({
    setIsSaving, closeModal, reloadPage, action, successMessage, fallbackErrorMessage,
}: SubscriptionMutationOptions) => {
    setIsSaving(true);
    try {
        await action();
        toast.success(successMessage);
        closeModal();
        reloadPage?.();
    } catch (error) {
        toast.error(extractApiErrorDetail(error, fallbackErrorMessage));
    } finally {
        setIsSaving(false);
    }
};
