import { useCallback, useEffect, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';

export interface TelegramConnectionStatus {
    linked: boolean;
    username?: string | null;
    displayName?: string | null;
    linkedAt?: string;
    lastLoginAt?: string | null;
}

// Mirrors useMollieConnection.ts's shape — same OAuth-connect-widget pattern,
// different provider.
export const useTelegramConnection = () => {
    const [connection, setConnection] = useState<TelegramConnectionStatus>();
    const [isLoading, setIsLoading] = useState(true);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [error, setError] = useState(false);

    const refresh = useCallback(() => {
        setIsLoading(true);
        return $apiPrivate.get<TelegramConnectionStatus>('/auth/telegram/status')
            .then(({ data }) => setConnection(data))
            .catch(() => setError(true))
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    // A full top-level navigation, not an XHR — the browser needs to actually
    // leave the SPA to reach Telegram's authorization page and come back.
    const onConnect = useCallback(() => {
        window.location.assign(`${__API__}/api/v1/auth/telegram/link/start`);
    }, []);

    const onDisconnect = useCallback(async () => {
        if (!window.confirm('Отключить Telegram?')) return;
        setIsDisconnecting(true);
        try {
            await $apiPrivate.delete('/auth/telegram/link');
            setConnection({ linked: false });
        } finally {
            setIsDisconnecting(false);
        }
    }, []);

    return {
        connection, isLoading, isDisconnecting, error, onConnect, onDisconnect,
    };
};
