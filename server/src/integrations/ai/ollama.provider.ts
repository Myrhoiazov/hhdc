import { z } from 'zod';
import { JSON_ONLY_INSTRUCTION, parseStructured, postJson } from './http';
import { AiProvider, AiUsage, StructuredOutputOptions } from './provider';

const chatSchema = z.object({ message: z.object({ content: z.string() }), prompt_eval_count: z.number().optional(), eval_count: z.number().optional() });
const embeddingSchema = z.object({ embeddings: z.array(z.array(z.number())) });

// Ollama silently cuts a prompt that does not fit its window (4096 tokens by default), so the
// window the prompt was sized for is requested explicitly.
const contextOptions = (env: NodeJS.ProcessEnv = process.env): { options?: { num_ctx: number } } => {
    const length = Number(env.LLM_CONTEXT_LENGTH);
    return Number.isInteger(length) && length >= 1024 ? { options: { num_ctx: length } } : {};
};

export class OllamaProvider implements AiProvider {
  private readonly baseUrl: string;
  onUsage?: (usage: AiUsage) => void;

  constructor(public model: string, credentials: Record<string, string> = {}, private readonly fetchImpl: typeof fetch = fetch) {
    this.baseUrl = (credentials.baseUrl ?? process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
  }

  private request(path: string, body: unknown) {
    return postJson({ url: `${this.baseUrl}${path}`, body, fetchImpl: this.fetchImpl, label: 'Ollama' });
  }

  private async chat(prompt: string, systemPrompt: string | undefined, json: boolean): Promise<string> {
    const messages = [...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []), { role: 'user', content: prompt }];
    // Reasoning is switched off: on a small local model it multiplies the response time (past the
    // request timeout on CPU) and tempts the model to rephrase facts it should copy.
    const body = { model: this.model, messages, stream: false, think: false, ...contextOptions(), ...(json ? { format: 'json' } : {}) };
    const reply = chatSchema.parse(await this.request('/api/chat', body));
    this.onUsage?.({ promptTokens: reply.prompt_eval_count, completionTokens: reply.eval_count });
    return reply.message.content;
  }

  generateText(prompt: string, systemPrompt?: string): Promise<string> {
    return this.chat(prompt, systemPrompt, false);
  }

  async generateStructured<T>(prompt: string, options: StructuredOutputOptions<T>): Promise<T> {
    const systemPrompt = [options.systemPrompt, JSON_ONLY_INSTRUCTION].filter(Boolean).join('\n\n');
    return parseStructured<T>(await this.chat(prompt, systemPrompt, true), options.schema);
  }

  async embed(texts: string[]): Promise<number[][]> {
    return embeddingSchema.parse(await this.request('/api/embed', { model: this.model, input: texts })).embeddings;
  }
}
