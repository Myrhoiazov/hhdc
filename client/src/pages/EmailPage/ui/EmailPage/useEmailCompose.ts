import { useCallback, useState } from 'react';
import { SendEmailPayload, sendEmailMessage } from '@/entities/EmailMessage';

export const useEmailCompose = (reloadMessages: () => Promise<void>) => {
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [isSendingCompose, setIsSendingCompose] = useState(false);

    const onSendCompose = useCallback(async (payload: SendEmailPayload) => {
        setIsSendingCompose(true);
        try {
            await sendEmailMessage(payload);
            await reloadMessages();
            return true;
        } catch {
            return false;
        } finally {
            setIsSendingCompose(false);
        }
    }, [reloadMessages]);

    return {
        isComposeOpen,
        setIsComposeOpen,
        isSendingCompose,
        onSendCompose,
    };
};
