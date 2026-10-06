import { useCallback, useState } from 'react';
import { syncEmailAccount as syncEmailAccountApi } from '@/entities/EmailAccount';

export const useEmailAccountSync = (loadAccounts: () => Promise<void>) => {
    const [syncingAccountId, setSyncingAccountId] = useState<number>();

    const syncAccount = useCallback(async (accountId: number, onSynced?: () => Promise<void> | void) => {
        setSyncingAccountId(accountId);
        try {
            await syncEmailAccountApi(accountId);
            await loadAccounts();
            await onSynced?.();
        } finally {
            setSyncingAccountId(undefined);
        }
    }, [loadAccounts]);

    return { syncingAccountId, syncAccount };
};
