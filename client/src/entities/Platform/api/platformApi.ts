import { $apiPrivate } from '@/shared/api/api';
import { postData, readData } from '@/shared/api/request';
import { FeatureFlag, ApiKey, WebhookEndpoint } from '../model/types';

export const listFeatureFlags = async () => readData<FeatureFlag[]>('/feature-flags');

export const setFeatureFlag = async (key: string, enabled: boolean) =>
    $apiPrivate.put(`/feature-flags/${key}`, { enabled });

export const listApiKeys = async () => readData<ApiKey[]>('/api-keys');

export const createApiKey = async (name: string, permissions: string[]) =>
    postData<ApiKey>('/api-keys', { name, permissions });

export const revokeApiKey = async (id: string) => postData<ApiKey>(`/api-keys/${id}/revoke`);

export const listWebhooks = async () => readData<WebhookEndpoint[]>('/webhooks');

export const createWebhook = async (input: { name: string; url: string; events: string[] }) =>
    postData<WebhookEndpoint>('/webhooks', input);
