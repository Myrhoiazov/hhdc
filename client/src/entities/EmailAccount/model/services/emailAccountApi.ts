import { $apiPrivate } from '@/shared/api/api';
import { CreateEmailAccountPayload, EmailAccount, EmailSyncResult } from '../types/emailAccount';

export const fetchEmailAccounts = async (): Promise<EmailAccount[]> => {
    const { data } = await $apiPrivate.get<EmailAccount[]>('/email/accounts');
    return data;
};

export const createEmailAccount = async (payload: CreateEmailAccountPayload): Promise<EmailAccount> => {
    const { data } = await $apiPrivate.post<EmailAccount>('/email/accounts', payload);
    return data;
};

export const deleteEmailAccount = async (accountId: number): Promise<void> => {
    await $apiPrivate.delete(`/email/accounts/${accountId}`);
};

export const syncEmailAccount = async (accountId: number): Promise<EmailSyncResult> => {
    const { data } = await $apiPrivate.post<EmailSyncResult>(`/email/accounts/${accountId}/sync`);
    return data;
};
