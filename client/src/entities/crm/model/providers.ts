import { $apiPrivate } from '@/shared/api/api';
import { PageResult } from './types';

export type ProviderSettings = Record<string, string | number | boolean | undefined>;
export interface ProviderConnection {
    id: string;
    name: string;
    type: string;
    provider: string;
    status: string;
    settings: ProviderSettings;
    lastSyncAt?: string | null;
    lastSuccessAt?: string | null;
    lastError?: string | null;
}
export interface ProviderInput {
    name: string;
    type: string;
    provider: string;
    status?: string;
    credentials?: Record<string, string>;
    settings?: ProviderSettings;
}
export interface ProviderTestResult { success: boolean; error: string | null; provider: ProviderConnection }
export interface EmailSyncSummary { created: number; skipped: number; failed: number }

const post = async <T,>(path: string, body?: unknown) => (await $apiPrivate.post<{ data: T }>(path, body)).data.data;

export const listProviders = async (): Promise<PageResult<ProviderConnection>> => {
    const result = (await $apiPrivate.get<{ data: ProviderConnection[]; meta: { total: number } }>('/providers?pageSize=100')).data;
    return { data: result.data, total: result.meta.total };
};
export const createProvider = async (input: ProviderInput) => post<ProviderConnection>('/providers', input);
export const updateProvider = async (id: string, input: Partial<ProviderInput>) =>
    (await $apiPrivate.patch<{ data: ProviderConnection }>(`/providers/${id}`, input)).data.data;
export const testProvider = async (id: string) => post<ProviderTestResult>(`/providers/${id}/test`);
export const syncProvider = async (id: string) => post<EmailSyncSummary>(`/providers/${id}/sync`);
export const deleteProvider = async (id: string) => $apiPrivate.delete(`/providers/${id}`);
