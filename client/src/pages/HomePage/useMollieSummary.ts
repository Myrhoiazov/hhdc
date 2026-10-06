import { useCallback, useEffect, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';
import { MollieDashboardSummary, FullSyncResult } from './homePageTypes';

const formatFullSyncResult = (result: FullSyncResult) => {
    const total = Object.values(result).reduce(
        (sum, item) => ({
            created: sum.created + item.created,
            updated: sum.updated + item.updated,
            skipped: sum.skipped + item.skipped,
            errors: sum.errors + item.errors,
        }),
        { created: 0, updated: 0, skipped: 0, errors: 0 },
    );

    return `Sync: создано ${total.created}, обновлено ${total.updated}, пропущено ${total.skipped}, ошибок ${total.errors}`;
};

export const useMollieSummary = () => {
    const [summary, setSummary] = useState<MollieDashboardSummary>();
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string>();
    const [syncMessage, setSyncMessage] = useState<string>();

    const fetchSummary = useCallback(async () => {
        setIsLoading(true);
        setError(undefined);
        try {
            const { data } = await $apiPrivate.get<MollieDashboardSummary>('/mollie/dashboard/summary');
            setSummary(data);
        } catch {
            setError('Не удалось загрузить Mollie summary');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchSummary(); }, [fetchSummary]);

    const onSyncMollie = useCallback(async () => {
        setIsSyncing(true);
        setError(undefined);
        setSyncMessage(undefined);
        try {
            const { data } = await $apiPrivate.post<FullSyncResult>('/mollie/sync');
            await fetchSummary();
            setSyncMessage(formatFullSyncResult(data));
        } catch {
            setError('Не удалось синхронизировать Mollie');
        } finally {
            setIsSyncing(false);
        }
    }, [fetchSummary]);

    return {
        summary, isLoading, isSyncing, error, syncMessage, onSyncMollie,
    };
};
