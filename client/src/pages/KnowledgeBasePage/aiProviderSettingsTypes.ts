export type AiDraftProvider = 'OLLAMA' | 'OPENAI';
export interface AiProviderSettings { provider: AiDraftProvider; model: string; updatedAt: string; }
