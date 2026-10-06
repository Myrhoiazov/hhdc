import { useCallback, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';
import { PaymentFilters } from './molliePaymentTypes';

interface SyncResult {
    created: number;
    updated: number;
    skipped: number;
    errors: number;
}

export const useMolliePaymentsSync = (
    filters: PaymentFilters,
    loadPayments: (filters: PaymentFilters, page: number) => Promise<void>,
) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string>();

    const onSyncPayments = useCallback(async () => {
        setIsSyncing(true);
        try {
            const { data } = await $apiPrivate.post<SyncResult>('/mollie/sync/payments');
            setSyncMessage(`Sync payments: создано ${data.created}, обновлено ${data.updated}, пропущено ${data.skipped}, ошибок ${data.errors}`);
            await loadPayments(filters, 1);
        } finally {
            setIsSyncing(false);
        }
    }, [filters, loadPayments]);

    return { isSyncing, syncMessage, onSyncPayments };
};
