import { $apiPrivate } from '@/shared/api/api';

const read = async <T,>(path: string) => (await $apiPrivate.get<{ data: T }>(path)).data.data;
const page = async <T,>(path: string) => {
    const result = (await $apiPrivate.get<{ data: T[]; meta: { total: number } }>(path)).data;
    return { data: result.data, total: result.meta.total };
};
const post = async <T,>(path: string, body?: unknown) => (await $apiPrivate.post<{ data: T }>(path, body)).data.data;

export interface KnowledgeSyncSummary {
    created: number; updated: number; embedded: number; unchanged: number; editedInCrm: number; failed: string[];
}
// Brings the bundled knowledge files into the knowledge base and embeds them for the assistant.
export const syncKnowledgeV2 = async (overwrite = false) => post<KnowledgeSyncSummary>('/knowledge/sync-v2', { overwrite });

export const EMAIL_PROMPT_KEYS = ['email_classification', 'email_draft_body'] as const;
export type EmailPromptKey = typeof EMAIL_PROMPT_KEYS[number];
export interface PromptVersion { id: string; key: string; version: number; purpose: string; systemPrompt: string; status: string; createdAt: string }
export const listPrompts = async () => read<PromptVersion[]>('/ai/prompts');
export const getDefaultEmailPrompts = async () => read<Record<EmailPromptKey, string>>('/ai/email-prompts/defaults');
export const createPromptVersion = async (input: { key: string; purpose: string; systemPrompt: string }) => post<PromptVersion>('/ai/prompts', input);
export const activatePrompt = async (id: string) => post<PromptVersion>(`/ai/prompts/${id}/activate`);

export interface SimulationClassification {
    spam: boolean; needsReply: boolean; replyLanguage: string; intent: string; secondaryIntents: string[];
    needsCRM: boolean; needsHumanAction: boolean; urgency: string; confidence: number;
}
export interface SimulationKnowledge { layer: string; chunkId: string; documentId: string; sourcePath: string; score: number; content: string }
export interface SimulationTrace {
    intent: string; secondaryIntents: string[]; language: string; eventYear: number; answerability: string;
    needsCRM: boolean; crmFound: boolean; needsHumanAction: boolean; confidence: string; needsStaffReview: boolean;
    warnings: string[]; attempts: number; retrievalDurationMs: number; generationDurationMs: number;
}
export interface SimulationMetric { stage: string; provider: string; model: string; calls: number; durationMs: number; promptTokens: number; completionTokens: number }
export interface SimulationView {
    classification: SimulationClassification;
    provider: string;
    model: string;
    promptVersion: string;
    draft: { subject: string; body: string; confidence: number; needsStaffReview: boolean } | null;
    trace: SimulationTrace | null;
    knowledge: SimulationKnowledge[];
    metrics: SimulationMetric[];
}
export interface EmailSimulation extends SimulationView { id: string; createdAt: string; status: string; durationMs: number; totalTokens: number }
export interface EmailSimulationInput {
    fromAddress?: string; subject: string; body: string; classificationPromptId?: string; draftPromptId?: string;
    providerConnectionId?: string; model?: string;
}
// A past run as listed in the history table, and with everything it produced.
export interface SimulationRunSummary {
    id: string; createdAt: string; subject: string; preview: string; status: string; provider: string | null; model: string | null;
    promptVersion: string | null; totalTokens: number; durationMs: number; error: string | null;
}
export interface SimulationRun extends Omit<SimulationRunSummary, 'preview'> { fromAddress: string; body: string; result: SimulationView | null }
export const SIMULATION_PAGE_SIZE = 10;
export const listSimulationRuns = async (pageNumber = 1) => page<SimulationRunSummary>(`/ai/email-simulations?page=${pageNumber}&pageSize=${SIMULATION_PAGE_SIZE}`);
export const getSimulationRun = async (id: string) => read<SimulationRun>(`/ai/email-simulations/${id}`);
// Runs the real assistant on a pasted email; nothing is stored or sent.
export const simulateEmail = async (input: EmailSimulationInput) => post<EmailSimulation>('/ai/email-simulation', input);
