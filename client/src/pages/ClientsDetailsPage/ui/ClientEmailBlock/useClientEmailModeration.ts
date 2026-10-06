import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { deleteEmailMessage, EmailMessage, markEmailMessageAsSpam } from '@/entities/EmailMessage';

type ModerationDeps = {
    setLoading: (value: boolean) => void;
    setSelectedMessage: Dispatch<SetStateAction<EmailMessage | undefined>>;
    reloadMessages: () => Promise<void>;
    notifyEmailMessagesUpdated: () => void;
};

// Shared by delete/mark-as-spam below — both clear the open message, reload
// the list, notify the unread badge, and toast on success/failure; only the
// API call and the toast copy differ.
const runModerationAction = async (
    deps: ModerationDeps,
    action: () => Promise<void>,
    successMessage: string,
    errorMessage: string,
) => {
    deps.setLoading(true);
    try {
        await action();
        deps.setSelectedMessage(undefined);
        await deps.reloadMessages();
        deps.notifyEmailMessagesUpdated();
        toast.success(successMessage);
    } catch {
        toast.error(errorMessage);
    } finally {
        deps.setLoading(false);
    }
};

export const useClientEmailModeration = (
    selectedMessage: EmailMessage | undefined,
    setSelectedMessage: Dispatch<SetStateAction<EmailMessage | undefined>>,
    reloadMessages: () => Promise<void>,
    notifyEmailMessagesUpdated: () => void,
) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isMarkingAsSpam, setIsMarkingAsSpam] = useState(false);

    const onDeleteMessage = useCallback(() => {
        if (!selectedMessage) {
            return Promise.resolve();
        }
        return runModerationAction(
            { setLoading: setIsDeleting, setSelectedMessage, reloadMessages, notifyEmailMessagesUpdated },
            () => deleteEmailMessage(selectedMessage.id),
            'Письмо удалено',
            'Не удалось удалить письмо',
        );
    }, [selectedMessage, setSelectedMessage, reloadMessages, notifyEmailMessagesUpdated]);

    const onMarkMessageAsSpam = useCallback(() => {
        if (!selectedMessage) {
            return Promise.resolve();
        }
        return runModerationAction(
            { setLoading: setIsMarkingAsSpam, setSelectedMessage, reloadMessages, notifyEmailMessagesUpdated },
            () => markEmailMessageAsSpam(selectedMessage.id),
            'Письмо помечено как спам',
            'Не удалось пометить письмо как спам',
        );
    }, [selectedMessage, setSelectedMessage, reloadMessages, notifyEmailMessagesUpdated]);

    return {
        isDeleting, isMarkingAsSpam, onDeleteMessage, onMarkMessageAsSpam,
    };
};
