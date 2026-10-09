import { $apiPrivate } from '@/shared/api/api';
import { PageResult } from './types';

const read = async <T,>(path: string) => (await $apiPrivate.get<{ data: T }>(path)).data.data;
const post = async <T,>(path: string, body?: unknown) => (await $apiPrivate.post<{ data: T }>(path, body)).data.data;
const page = async <T,>(path: string): Promise<PageResult<T>> => {
    const result = (await $apiPrivate.get<{ data: T[]; meta: { total: number } }>(path)).data;
    return { data: result.data, total: result.meta.total };
};

export interface AutomationActionRun { id: string; status: string; error?: string | null; input: { type?: string } }
export interface AutomationRun { id: string; status: string; dryRun: boolean; startedAt: string; error?: string | null; actionRuns: AutomationActionRun[] }
export interface Automation { id: string; name: string; status: string; triggerType: string; actions: { id: string; type: string }[] }
export interface AutomationInput { name: string; triggerType: string; conditions: unknown; actions: { type: string; config: unknown }[] }
export interface AutomationTest { matched: boolean; run: AutomationRun | null; recentTriggerEvents: number; sideEffects: string[] }
export const getAutomationMeta = async () => read<{ triggers: string[]; actions: string[] }>('/automations/meta');
export const listAutomations = async () => page<Automation>('/automations');
export const createAutomation = async (input: AutomationInput) => post<Automation>('/automations', input);
export const setAutomationStatus = async (id: string, action: 'activate' | 'pause' | 'archive') => post<Automation>(`/automations/${id}/${action}`);
export const testAutomation = async (id: string, payload: Record<string, string>) => post<AutomationTest>(`/automations/${id}/test`, { payload });
export const listAutomationRuns = async (id: string) => page<AutomationRun>(`/automations/${id}/runs`);

export interface Refund { id: string; amount: string; currency: string; status: string; reason: string; error?: string | null; person?: { displayName: string } | null }
export const listRefunds = async () => page<Refund>('/refunds');
export const requestRefund = async (input: { paymentId: string; amount: string; reason: string }) => post<Refund>('/refunds', input);
export const actOnRefund = async (id: string, action: 'approve' | 'reject' | 'process' | 'sync') => post<Refund>(`/refunds/${id}/${action}`);

export interface AiProposal { id: string; type: string; status: string; payload: { title?: string; description?: string; dueDate?: string } }
export interface AssistantAnswer { answer: string; references: { tool: string; ok: boolean }[]; proposal: AiProposal | null }
export interface ReviewQueue { drafts: { id: string; conversationId: string; intent: string; confidence?: number | null }[]; lowConfidenceDrafts: number; proposals: AiProposal[]; duplicates: { id: string; score: number }[] }
export const askAssistant = async (question: string) => post<AssistantAnswer>('/ai/assistant', { question });
export const decideProposal = async (id: string, decision: 'confirm' | 'reject') => post<unknown>(`/ai/actions/${id}/${decision}`);
export const getReviewQueue = async () => read<ReviewQueue>('/ai/review-queue');

export interface OperationsHealth { failedJobs: number; failedOutbox: number; pendingOutbox: number; failedWebhooks: number; failedAutomationRuns: number; providers: { id: string; name: string; status: string; lastError?: string | null }[] }
export interface Task { id: string; title: string; status: string; priority: string; dueDate?: string | null }
export interface CheckinResult { registration: { id: string; person: { displayName: string }; event: { name: string }; ticket?: { ticketType: string } | null }; checkedInAt: string }
export const getOperationsHealth = async () => read<OperationsHealth>('/operations/health');
export const listTasks = async () => read<Task[]>('/tasks');
export const updateTaskStatus = async (id: string, status: string) => $apiPrivate.patch(`/tasks/${id}`, { status });
export const checkIn = async (code: string, eventId?: string) => post<CheckinResult>('/check-in/event-entry', { code, eventId: eventId || undefined });

interface PersonBrief { id: string; displayName: string; email?: string | null; phone?: string | null }
export interface DuplicateCandidate { id: string; score: number; reasons: string[]; personA?: PersonBrief; personB?: PersonBrief }
export const listDuplicates = async () => page<DuplicateCandidate>('/duplicates');
export const scanDuplicates = async () => post<{ scanned: number; created: number }>('/duplicates/scan');
export const resolveDuplicate = async (id: string, status: 'NOT_DUPLICATE' | 'IGNORED') => post<unknown>(`/duplicates/${id}/resolve`, { status });
export const mergePeople = async (targetId: string, sourcePersonId: string) => post<unknown>(`/people/${targetId}/merge`, { sourcePersonId, fieldDecisions: {} });
export const createExport = async (entity: string) => post<{ filename: string; csv: string; rows: number }>('/exports', { entity });

export interface Campaign { id: string; name: string; status: string; segment?: { name: string } }
export interface CampaignPreview { recipients: number; byLanguage: Record<string, number>; excluded: { noConsent: number; missingEmail: number } }
export const listCampaigns = async () => page<Campaign>('/campaigns');
export const previewCampaign = async (id: string) => post<CampaignPreview>(`/campaigns/${id}/preview`);
export const sendCampaign = async (id: string, confirmRecipientCount: number) => post<unknown>(`/campaigns/${id}/send`, { confirmRecipientCount });

export interface FeatureFlag { key: string; enabled: boolean }
export interface ApiKey { id: string; name: string; prefix: string; status: string; permissions: string[]; key?: string }
export interface WebhookEndpoint { id: string; name: string; url: string; status: string; events: string[]; secret?: string }
export const listFeatureFlags = async () => read<FeatureFlag[]>('/feature-flags');
export const setFeatureFlag = async (key: string, enabled: boolean) => $apiPrivate.put(`/feature-flags/${key}`, { enabled });
export const listApiKeys = async () => read<ApiKey[]>('/api-keys');
export const createApiKey = async (name: string, permissions: string[]) => post<ApiKey>('/api-keys', { name, permissions });
export const revokeApiKey = async (id: string) => post<ApiKey>(`/api-keys/${id}/revoke`);
export const listWebhooks = async () => read<WebhookEndpoint[]>('/webhooks');
export const createWebhook = async (input: { name: string; url: string; events: string[] }) => post<WebhookEndpoint>('/webhooks', input);

// Every movement of money as one list: payments of buyers, refunds and costs of events.
export const LEDGER_CATEGORIES = ['TICKETS', 'REFUNDS', 'FEE', 'SALARY', 'TRAVEL', 'HOTEL', 'VENUE', 'MARKETING', 'EQUIPMENT', 'OTHER'] as const;
export type LedgerCategory = typeof LEDGER_CATEGORIES[number];
export interface LedgerEntry {
    id: string; kind: 'PAYMENT' | 'REFUND' | 'EXPENSE'; category: string; direction: 'IN' | 'OUT'; date: string; amount: string; currency: string; status: string;
    description: string | null; person: { id: string; name: string } | null; event: { id: string; name: string } | null; counted: boolean;
    paidAmount: string | null;
}
export interface LedgerCategoryTotal { category: string; direction: 'IN' | 'OUT'; operations: number; amount: string }
export interface LedgerSummary { currency: string; income: string; refunds: string; expenses: string; planned: string; result: string; operations: number; byCategory: LedgerCategoryTotal[] }
export interface LedgerFilters { q: string; category: LedgerCategory | ''; eventId: string; from: string; to: string }
export const LEDGER_PAGE_SIZE = 25;
export const listLedgerPage = async (filters: LedgerFilters, pageNumber: number) =>
    page<LedgerEntry>(`/finance/ledger?${new URLSearchParams({ ...filters, page: String(pageNumber), pageSize: String(LEDGER_PAGE_SIZE) }).toString()}`);
export const getLedgerSummary = async (filters: LedgerFilters) => read<LedgerSummary>(`/finance/ledger/summary?${new URLSearchParams({ ...filters }).toString()}`);

// Which messages the bot sends to Telegram, one switch per notification.
export const NOTIFICATION_GROUPS = ['SALES', 'EMAIL', 'PEOPLE_AND_FINANCE'] as const;
export type NotificationGroup = typeof NOTIFICATION_GROUPS[number];
export interface NotificationSetting {
    key: string; group: NotificationGroup; title: string; enabled: boolean; configured: boolean;
    // The text that is sent, the one it started as, whether staff changed it, and the values it can carry as {{name}}.
    template: string; defaultTemplate: string; customised: boolean; placeholders: { name: string; example: string }[];
    updatedAt: string | null; updatedBy: { id: string; name: string; email: string } | null;
}
export const listNotificationSettings = async () => read<NotificationSetting[]>('/telegram-notifications');
const changeNotification = async (key: string, change: { enabled?: boolean; template?: string | null }) =>
    (await $apiPrivate.put<{ data: NotificationSetting }>(`/telegram-notifications/${key}`, change)).data.data;
export const setNotificationEnabled = async (key: string, enabled: boolean) => changeNotification(key, { enabled });
// `null` returns to the text the notification started with.
export const saveNotificationTemplate = async (key: string, template: string | null) => changeNotification(key, { template });
export const sendTestNotification = async (key: string) => post<{ sent: boolean; text: string }>(`/telegram-notifications/${key}/test`);
