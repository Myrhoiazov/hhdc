import { useCallback, useState } from 'react';
import { EmailMessage, fetchEmailMessage, replyToEmailMessage } from '@/entities/EmailMessage';

export const useClientEmailSelection = (
    reloadMessages: () => Promise<void>,
    notifyEmailMessagesUpdated: () => void,
) => {
    const [selectedMessage, setSelectedMessage] = useState<EmailMessage>();
    const [isSendingReply, setIsSendingReply] = useState(false);

    const onSelectMessage = useCallback(async (message: EmailMessage) => {
        setSelectedMessage(await fetchEmailMessage(message.id));
        notifyEmailMessagesUpdated();
    }, [notifyEmailMessagesUpdated]);

    const onReply = useCallback(async (html: string, files?: File[]) => {
        if (!selectedMessage) {
            return false;
        }

        setIsSendingReply(true);
        try {
            await replyToEmailMessage(selectedMessage.id, html, files);
            await reloadMessages();
            return true;
        } catch {
            return false;
        } finally {
            setIsSendingReply(false);
        }
    }, [selectedMessage, reloadMessages]);

    return {
        selectedMessage, setSelectedMessage, isSendingReply, onSelectMessage, onReply,
    };
};
