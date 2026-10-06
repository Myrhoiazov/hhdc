import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StateView } from '@/shared/ui/StateView';
import { useTelegramConnection } from './useTelegramConnection';
import { TelegramConnectionCard } from './TelegramConnectionCard';

export const TelegramConnection = memo(() => {
    const { t } = useTranslation('profile');
    const {
        connection, isLoading, isDisconnecting, error, onConnect, onDisconnect,
    } = useTelegramConnection();

    if (error) {
        return (
            <StateView
                tone="error"
                title={t('Telegram')}
                text={t('Не удалось загрузить статус подключения Telegram.')}
            />
        );
    }

    if (isLoading || !connection) {
        return null;
    }

    return (
        <TelegramConnectionCard
            connection={connection}
            isDisconnecting={isDisconnecting}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
        />
    );
});
