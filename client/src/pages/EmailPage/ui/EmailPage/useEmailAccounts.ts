import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
    createEmailAccount,
    CreateEmailAccountPayload,
    deleteEmailAccount,
    EmailAccount,
    fetchEmailAccounts,
} from '@/entities/EmailAccount';

// Surfacing the server's actual message lets the user tell "IMAP unreachable"
// apart from "SMTP host is empty" instead of one generic failure toast.
const extractCreateAccountError = (error: unknown): string => {
    if (axios.isAxiosError(error) && typeof error.response?.data?.message === 'string') {
        return error.response.data.message as string;
    }
    return 'Не удалось подключить ящик';
};

export const useEmailAccounts = (isAdmin: boolean) => {
    const [accounts, setAccounts] = useState<EmailAccount[]>([]);
    const [selectedMailboxId, setSelectedMailboxId] = useState<number>();

    const loadAccounts = useCallback(async () => {
        setAccounts(await fetchEmailAccounts());
    }, []);

    useEffect(() => {
        if (isAdmin) {
            loadAccounts();
        }
    }, [isAdmin, loadAccounts]);

    // Returns undefined on success, or an error message to show on failure.
    const onCreateAccount = useCallback(async (payload: CreateEmailAccountPayload) => {
        try {
            await createEmailAccount(payload);
            await loadAccounts();
            return undefined;
        } catch (error) {
            return extractCreateAccountError(error);
        }
    }, [loadAccounts]);

    const onDeleteAccount = useCallback(async (accountId: number) => {
        if (!window.confirm('Отключить этот почтовый ящик? Синхронизированные письма останутся в истории.')) {
            return;
        }
        await deleteEmailAccount(accountId);
        if (selectedMailboxId === accountId) {
            setSelectedMailboxId(undefined);
        }
        await loadAccounts();
    }, [loadAccounts, selectedMailboxId]);

    return {
        accounts,
        loadAccounts,
        selectedMailboxId,
        setSelectedMailboxId,
        onCreateAccount,
        onDeleteAccount,
    };
};
