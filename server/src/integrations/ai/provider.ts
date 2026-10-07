export interface StructuredOutputOptions<T> {
  schema: any; // Zod schema
  systemPrompt?: string;
}

export interface AiUsage { promptTokens?: number; completionTokens?: number }

export interface AiProvider {
  model: string;
  // Called after every chat completion with the token counts the provider reported.
  onUsage?: (usage: AiUsage) => void;
  generateText(prompt: string, systemPrompt?: string): Promise<string>;
  generateStructured<T>(prompt: string, options: StructuredOutputOptions<T>): Promise<T>;
  embed(texts: string[]): Promise<number[][]>;
}

export interface ProviderConfig {
  provider: 'OPENAI' | 'OLLAMA';
  model: string;
  credentials?: Record<string, string>;
}

import { OpenAiProvider } from './openai.provider';
import { OllamaProvider } from './ollama.provider';

export function createAiProvider(config: ProviderConfig): AiProvider {
  if (config.provider === 'OPENAI') return new OpenAiProvider(config.model, config.credentials);
  if (config.provider === 'OLLAMA') return new OllamaProvider(config.model, config.credentials);
  throw new Error(`Unsupported AI provider: ${config.provider}`);
}
