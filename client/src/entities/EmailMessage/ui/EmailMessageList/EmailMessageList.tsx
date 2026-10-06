import { memo } from 'react';
import { Text } from '@/shared/ui/Text/Text';
import { EmailMessage } from '../../model/types/emailMessage';
import cls from './EmailMessageList.module.scss';

interface EmailMessageListProps {
    messages: EmailMessage[];
    selectedMessageId?: number;
    isLoading?: boolean;
    onSelect: (message: EmailMessage) => void;
}

const formatDate = (value: string) => new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
});

const displayName = (message: EmailMessage) => {
    if (message.isOutgoing) {
        return `Вам: ${message.toAddresses[0]?.address ?? '—'}`;
    }

    return message.fromName || message.fromAddress;
};

export const EmailMessageList = memo((props: EmailMessageListProps) => {
    const { messages, selectedMessageId, isLoading, onSelect } = props;

    if (isLoading) {
        return <Text text="Загрузка писем..." size="s" />;
    }

    if (!messages.length) {
        return <Text text="Писем пока нет. Нажмите Sync, чтобы получить входящие." size="s" />;
    }

    return (
        <div className={cls.list}>
            {messages.map((message) => (
                <button
                    key={message.id}
                    type="button"
                    className={`${cls.item} ${message.id === selectedMessageId ? cls.active : ''} ${!message.isRead && !message.isOutgoing ? cls.unread : ''}`}
                    onClick={() => onSelect(message)}
                >
                    <div className={cls.row}>
                        <span className={cls.from}>{displayName(message)}</span>
                        <span className={cls.date}>{formatDate(message.receivedAt)}</span>
                    </div>
                    <div className={cls.subject}>
                        {message.subject || '(без темы)'}
                        {message.attachments.length > 0 && (
                            <span className={cls.attachmentIcon} title={`Вложений: ${message.attachments.length}`}>📎</span>
                        )}
                    </div>
                    {message.client && (
                        <span className={cls.clientBadge}>
                            {[message.client.firstName, message.client.lastName].filter(Boolean).join(' ') || message.client.email}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
});
