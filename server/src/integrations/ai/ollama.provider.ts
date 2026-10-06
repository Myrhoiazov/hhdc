import { z } from 'zod';
import { JSON_ONLY_INSTRUCTION, parseStructured, postJson } from './http';
import { AiProvider, StructuredOutputOptions } from './provider';

const chatSchema = z.object({ message: z.object({ content: z.string() }) });
const embeddingSchema = z.object({ embeddings: z.array(z.array(z.number())) });

export class OllamaProvider implements AiProvider {
  private readonly baseUrl: string;

  constructor(public model: string, credentials: Record<string, string> = {}, private readonly fetchImpl: typeof fetch = fetch) {
    this.baseUrl = (credentials.baseUrl ?? process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
  }

  private request(path: string, body: unknown) {
    return postJson({ url: `${this.baseUrl}${path}`, body, fetchImpl: this.fetchImpl, label: 'Ollama' });
  }

  private async chat(prompt: string, systemPrompt: string | undefined, json: boolean): Promise<string> {
    const messages = [...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []), { role: 'user', content: prompt }];
    const body = { model: this.model, messages, stream: false, ...(json ? { format: 'json' } : {}) };
    return chatSchema.parse(await this.request('/api/chat', body)).message.content;
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
