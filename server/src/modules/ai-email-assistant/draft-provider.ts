import type { DraftContext, DraftLlmClient, EmailDraft } from './draft.service';

export const DRAFT_PROVIDERS = { OLLAMA: 'OLLAMA', OPENAI: 'OPENAI' } as const;
export type DraftProviderName = typeof DRAFT_PROVIDERS[keyof typeof DRAFT_PROVIDERS];

export type DraftProviderErrorCode = 'PROVIDER_NOT_CONFIGURED' | 'TIMEOUT' | 'RATE_LIMITED' | 'INVALID_RESPONSE' | 'UNAVAILABLE';
export class DraftProviderError extends Error {
  public constructor(public readonly code: DraftProviderErrorCode, message: string) { super(message); this.name = 'DraftProviderError'; }
}
export interface DraftProvider extends DraftLlmClient {
  readonly provider: DraftProviderName;
  readonly model: string;
  generateDraft(context: DraftContext): Promise<EmailDraft>;
}

export interface LlmCallMetric {
  durationMs: number;
  callCount: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}
