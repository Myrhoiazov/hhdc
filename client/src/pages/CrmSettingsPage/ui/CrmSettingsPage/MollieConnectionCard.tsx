import { memo } from 'react';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { VStack } from '@/shared/ui/Stack';
import type { MollieConnectionStatus } from './useMollieConnection';
import { MollieConnectionActions } from './MollieConnectionActions';
import { MollieConnectionDetails } from './MollieConnectionDetails';
import s from './CrmSettingsPage.module.scss';

interface MollieConnectionCardProps {
    connection: MollieConnectionStatus;
    isDisconnecting: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
}

export const MollieConnectionCard = memo((props: MollieConnectionCardProps) => {
    const { connection, isDisconnecting, onConnect, onDisconnect } = props;
    const status = connection.source === 'oauth' ? 'OAuth подключён' : connection.source === 'api_key' ? 'Используется API key' : 'Не подключено';

    return (
        <Card padding="24" fullWidth className={s.card}>
            <VStack max gap="16">
                <div className={s.header}>
                    <div>
                        <Text title="Интеграция Mollie OAuth" size="m" bold />
                        <Text text="Дополнительный способ подключения Mollie к CRM." size="s" className={s.subtitle} />
                    </div>
                    <span className={`${s.badge} ${connection.isConnected ? s.connected : s.disconnected}`}>{status}</span>
                </div>
                <MollieConnectionDetails connection={connection} />
                <MollieConnectionActions connection={connection} isDisconnecting={isDisconnecting} onConnect={onConnect} onDisconnect={onDisconnect} />
            </VStack>
        </Card>
    );
});
