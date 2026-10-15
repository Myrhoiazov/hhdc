import { $apiPrivate } from '@/shared/api/api';
import { PageResult, postData } from '@/shared/api/request';
import {
    ProviderConnection,
    ProviderInput,
    ProviderTestResult,
    EmailSyncSummary,
    WeeztixAuthorization,
    WeeztixCheckResult,
    WeeztixContactsResult,
    WeeztixCatalogResult,
    WeeztixSalesResult,
    SyncRun,
} from '../model/types';

export const listProviders = async (): Promise<PageResult<ProviderConnection>> => {
    const result = (
        await $apiPrivate.get<{ data: ProviderConnection[]; meta: { total: number } }>(
            '/providers?pageSize=100'
        )
    ).data;
    return { data: result.data, total: result.meta.total };
};

export const createProvider = async (input: ProviderInput) =>
    postData<ProviderConnection>('/providers', input);

export const updateProvider = async (id: string, input: Partial<ProviderInput>) =>
    (await $apiPrivate.patch<{ data: ProviderConnection }>(`/providers/${id}`, input)).data.data;

export const testProvider = async (id: string) =>
    postData<ProviderTestResult>(`/providers/${id}/test`);

export const syncProvider = async (id: string) =>
    postData<EmailSyncSummary>(`/providers/${id}/sync`);

export const activateAiProvider = async (id: string) =>
    postData<ProviderConnection>(`/providers/${id}/activate-ai`);

export const deleteProvider = async (id: string) => $apiPrivate.delete(`/providers/${id}`);

export const startWeeztixAuthorization = async () =>
    postData<WeeztixAuthorization>('/providers/weeztix/authorize');

export const connectWeeztix = async (address: string, state: string) =>
    postData<ProviderConnection>('/providers/weeztix/connect', { address, state });

export const checkWeeztix = async (id: string) =>
    postData<WeeztixCheckResult>(`/providers/${id}/weeztix-check`);

export const previewWeeztixContacts = async (id: string) =>
    postData<WeeztixContactsResult>(`/providers/${id}/weeztix-contacts`, { dryRun: true });

export const importWeeztixContacts = async (id: string) =>
    postData<WeeztixContactsResult>(`/providers/${id}/weeztix-contacts`, { dryRun: false });

export const syncWeeztixCatalog = async (id: string) =>
    postData<WeeztixCatalogResult>(`/providers/${id}/weeztix-catalog`);

export const syncWeeztixSales = async (id: string) =>
    postData<WeeztixSalesResult>(`/providers/${id}/weeztix-sales`);

export const listSyncRuns = async (id: string) =>
    (await $apiPrivate.get<{ data: SyncRun[] }>(`/providers/${id}/sync-runs`)).data.data;
