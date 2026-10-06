import { memo } from 'react';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { HStack } from '@/shared/ui/Stack';
import type { MollieConnectionStatus } from './useMollieConnection';

interface MollieConnectionActionsProps {
    connection: MollieConnectionStatus;
    isDisconnecting: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
}

export const MollieConnectionActions = memo((props: MollieConnectionActionsProps) => {
    const { connection, isDisconnecting, onConnect, onDisconnect } = props;

    return (
        <HStack gap="8" wrap="wrap">
            <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onConnect}>
                {connection.source === 'oauth' ? 'Переподключить OAuth' : 'Подключить OAuth'}
            </Button>
            {connection.source === 'oauth' && connection.connectedByCurrentUser && (
                <Button theme={ButtonTheme.OUTLINE_RED} disabled={isDisconnecting} onClick={onDisconnect}>
                    {isDisconnecting ? 'Отключение...' : 'Отключить OAuth'}
                </Button>
            )}
        </HStack>
    );
});
