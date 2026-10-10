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
    // The AI provider chosen to write answers and drafts.
    activeForGeneration?: boolean;
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
export const activateAiProvider = async (id: string) => post<ProviderConnection>(`/providers/${id}/activate-ai`);
export const deleteProvider = async (id: string) => $apiPrivate.delete(`/providers/${id}`);

// Weeztix is connected by approving access in Weeztix itself; no secret is ever typed into the CRM.
export interface WeeztixAuthorization { url: string; redirectUri: string; state: string }
export interface WeeztixCheckResult { success: boolean; error: string | null; account: { name: string; email: string } | null; provider: ProviderConnection }
export const startWeeztixAuthorization = async () => post<WeeztixAuthorization>('/providers/weeztix/authorize');
export const connectWeeztix = async (address: string, state: string) => post<ProviderConnection>('/providers/weeztix/connect', { address, state });
export const checkWeeztix = async (id: string) => post<WeeztixCheckResult>(`/providers/${id}/weeztix-check`);

// Buyers of Weeztix orders become people. A preview reads Weeztix and writes nothing.
export interface WeeztixContactsResult { dryRun: boolean; orders: number; contacts: number; created: number; linked: number; known: number; ambiguous: number; failed: number }
export interface WeeztixCatalogResult { events: number; created: number; updated: number; unchanged: number; ticketTypes: number; coupons: number; unreadable: number; failed: number }
export const previewWeeztixContacts = async (id: string) => post<WeeztixContactsResult>(`/providers/${id}/weeztix-contacts`, { dryRun: true });
export const importWeeztixContacts = async (id: string) => post<WeeztixContactsResult>(`/providers/${id}/weeztix-contacts`, { dryRun: false });
export const syncWeeztixCatalog = async (id: string) => post<WeeztixCatalogResult>(`/providers/${id}/weeztix-catalog`);
export interface WeeztixSalesResult { catalog: WeeztixCatalogResult; sales: { orders: number; created: number; updated: number; unchanged: number; tickets: number; registrations: number; newPeople: number; withoutBuyer: number; unreadable: number; failed: number; firstError: string | null } }
export const syncWeeztixSales = async (id: string) => post<WeeztixSalesResult>(`/providers/${id}/weeztix-sales`);

// One run of a sync: when it ran, what it read and why it failed.
export interface SyncRun {
    id: string; type: string; status: string; startedAt: string; finishedAt: string | null;
    createdCount: number; updatedCount: number; skippedCount: number; failedCount: number; errorSummary: string | null; metadata: { scope?: string };
}
export const listSyncRuns = async (id: string) => (await $apiPrivate.get<{ data: SyncRun[] }>(`/providers/${id}/sync-runs`)).data.data;
