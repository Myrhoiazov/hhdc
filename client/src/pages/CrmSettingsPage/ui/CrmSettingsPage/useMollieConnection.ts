import { useCallback, useEffect, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';

export interface MollieConnectionStatus {
    source: 'oauth' | 'api_key' | 'none';
    isConnected: boolean;
    connectedByCurrentUser: boolean;
    expiresAt?: string;
    lastRefreshedAt?: string;
    updatedAt?: string;
}

export const useMollieConnection = () => {
    const [connection, setConnection] = useState<MollieConnectionStatus>();
    const [isLoading, setIsLoading] = useState(true);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        $apiPrivate.get<MollieConnectionStatus>('/mollie/connection/status')
            .then(({ data }) => setConnection(data))
            .catch(() => setError(true))
            .finally(() => setIsLoading(false));
    }, []);

    const onConnect = useCallback(() => {
        window.location.assign(`${__API__}/api/v1/mollie/connect`);
    }, []);

    const onDisconnect = useCallback(async () => {
        if (!window.confirm('Отключить OAuth-подключение Mollie?')) return;
        setIsDisconnecting(true);
        try {
            const { data } = await $apiPrivate.post<{ fallback: 'api_key' | 'none' }>('/mollie/connection/disconnect');
            setConnection({ source: data.fallback, isConnected: data.fallback === 'api_key', connectedByCurrentUser: false });
        } finally {
            setIsDisconnecting(false);
        }
    }, []);

    return { connection, isLoading, isDisconnecting, error, onConnect, onDisconnect };
};
