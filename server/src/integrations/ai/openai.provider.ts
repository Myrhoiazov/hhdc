import { z } from 'zod';
import { JSON_ONLY_INSTRUCTION, parseStructured, postJson } from './http';
import { AiProvider, AiUsage, StructuredOutputOptions } from './provider';

const chatSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
  usage: z.object({ prompt_tokens: z.number().optional(), completion_tokens: z.number().optional() }).optional(),
});
const embeddingSchema = z.object({ data: z.array(z.object({ index: z.number(), embedding: z.array(z.number()) })) });

export class OpenAiProvider implements AiProvider {
  private readonly baseUrl: string;
  onUsage?: (usage: AiUsage) => void;

  constructor(public model: string, private readonly credentials: Record<string, string> = {}, private readonly fetchImpl: typeof fetch = fetch) {
    this.baseUrl = (credentials.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  }

  private request(path: string, body: unknown) {
    if (!this.credentials.apiKey) throw new Error('OpenAI API key is not configured');
    return postJson({ url: `${this.baseUrl}${path}`, body, fetchImpl: this.fetchImpl, label: 'OpenAI', headers: { authorization: `Bearer ${this.credentials.apiKey}` } });
  }

  private async chat(prompt: string, systemPrompt: string | undefined, json: boolean): Promise<string> {
    const messages = [...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []), { role: 'user', content: prompt }];
    const body = { model: this.model, messages, ...(json ? { response_format: { type: 'json_object' } } : {}) };
    const reply = chatSchema.parse(await this.request('/chat/completions', body));
    this.onUsage?.({ promptTokens: reply.usage?.prompt_tokens, completionTokens: reply.usage?.completion_tokens });
    return reply.choices[0].message.content;
  }

  generateText(prompt: string, systemPrompt?: string): Promise<string> {
    return this.chat(prompt, systemPrompt, false);
  }

  async generateStructured<T>(prompt: string, options: StructuredOutputOptions<T>): Promise<T> {
    const systemPrompt = [options.systemPrompt, JSON_ONLY_INSTRUCTION].filter(Boolean).join('\n\n');
    return parseStructured<T>(await this.chat(prompt, systemPrompt, true), options.schema);
  }

  async embed(texts: string[]): Promise<number[][]> {
    const result = embeddingSchema.parse(await this.request('/embeddings', { model: this.model, input: texts }));
    return [...result.data].sort((a, b) => a.index - b.index).map(item => item.embedding);
  }
}
