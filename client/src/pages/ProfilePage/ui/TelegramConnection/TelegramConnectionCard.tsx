import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { VStack, HStack } from '@/shared/ui/Stack';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import type { TelegramConnectionStatus } from './useTelegramConnection';
import cls from './TelegramConnectionCard.module.scss';

// Same shape as ActiveSessionItem.tsx's formatDate — kept as its own copy
// rather than a shared export, matching that file's existing convention.
const formatDate = (value?: string | null) => {
    if (!value) return '—';
    return new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
};

interface TelegramConnectionCardProps {
    connection: TelegramConnectionStatus;
    isDisconnecting: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
}

export const TelegramConnectionCard = memo((props: TelegramConnectionCardProps) => {
    const { connection, isDisconnecting, onConnect, onDisconnect } = props;
    const { t } = useTranslation('profile');

    return (
        <Card padding="24" fullWidth className={cls.card}>
            <VStack max gap="16">
                <div className={cls.header}>
                    <div>
                        <Text title={t('Telegram')} size="m" bold />
                        <Text text={t('Дополнительный способ входа в CRM.')} size="s" className={cls.subtitle} />
                    </div>
                    <span className={`${cls.badge} ${connection.linked ? cls.connected : cls.disconnected}`}>
                        {connection.linked ? t('Подключён') : t('Не подключён')}
                    </span>
                </div>

                {connection.linked && (
                    <div className={cls.meta}>
                        {connection.username && <span>@{connection.username}</span>}
                        <span>{t('Подключено')}: {formatDate(connection.linkedAt)}</span>
                        <span>{t('Последний вход')}: {formatDate(connection.lastLoginAt)}</span>
                    </div>
                )}

                <HStack gap="8" wrap="wrap">
                    {connection.linked ? (
                        <Button theme={ButtonTheme.OUTLINE_RED} disabled={isDisconnecting} onClick={onDisconnect}>
                            {isDisconnecting ? t('Отключение...') : t('Отключить Telegram')}
                        </Button>
                    ) : (
                        <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onConnect}>
                            {t('Подключить Telegram')}
                        </Button>
                    )}
                </HStack>
            </VStack>
        </Card>
    );
});
