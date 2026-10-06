import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { EmailMessage, fetchEmailMessage, replyToEmailMessage } from '@/entities/EmailMessage';

export const useEmailMessageSelection = (
    reloadMessages: () => Promise<void>,
    setMessages: Dispatch<SetStateAction<EmailMessage[]>>,
    notifyEmailMessagesUpdated: () => void,
) => {
    const [selectedMessage, setSelectedMessage] = useState<EmailMessage>();
    const [isSendingReply, setIsSendingReply] = useState(false);

    const onSelectMessage = useCallback(async (message: EmailMessage) => {
        const fullMessage = await fetchEmailMessage(message.id);
        setSelectedMessage(fullMessage);
        setMessages((prev) => prev.map((item) => (item.id === message.id ? { ...item, isRead: true } : item)));
        notifyEmailMessagesUpdated();
    }, [setMessages, notifyEmailMessagesUpdated]);

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
        selectedMessage,
        setSelectedMessage,
        isSendingReply,
        onSelectMessage,
        onReply,
    };
};
