import { memo } from 'react';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { HStack } from '@/shared/ui/Stack';
import { EmailMessage } from '../../model/types/emailMessage';
import cls from './EmailMessageDetail.module.scss';

const formatDate = (value: string) => new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

interface EmailMessageDetailHeaderProps {
    message: EmailMessage;
    isDeleting?: boolean;
    isMarkingAsSpam?: boolean;
    onDeleteClick: () => void;
    onMarkAsSpamClick: () => void;
}

export const EmailMessageDetailHeader = memo((props: EmailMessageDetailHeaderProps) => {
    const { message, isDeleting, isMarkingAsSpam, onDeleteClick, onMarkAsSpamClick } = props;

    return (
        <HStack justify="between" align="start" max>
            <div>
                <Text title={message.subject || '(без темы)'} size="m" bold />
                <Text
                    text={`${message.isOutgoing ? 'Кому' : 'От'}: ${message.isOutgoing ? message.toAddresses.map((a) => a.address).join(', ') : `${message.fromName ? `${message.fromName} ` : ''}<${message.fromAddress}>`}`}
                    size="s"
                />
                <Text text={formatDate(message.receivedAt)} size="s" className={cls.date} />
                {message.client && (
                    <Text text={`Клиент: ${[message.client.firstName, message.client.lastName].filter(Boolean).join(' ')}`} size="s" variant="accent" />
                )}
            </div>

            <HStack gap="8" className={cls.actions}>
                {!message.isOutgoing && (
                    <Button
                        theme={ButtonTheme.OUTLINE}
                        disabled={isMarkingAsSpam}
                        onClick={onMarkAsSpamClick}
                    >
                        {isMarkingAsSpam ? 'Отправка...' : 'В спам'}
                    </Button>
                )}
                <Button
                    theme={ButtonTheme.OUTLINE_RED}
                    disabled={isDeleting}
                    onClick={onDeleteClick}
                >
                    {isDeleting ? 'Удаление...' : 'Удалить'}
                </Button>
            </HStack>
        </HStack>
    );
});
