import test from 'node:test';
import assert from 'node:assert/strict';
import { OpenAiDraftClient } from './openai.client';
import { DraftProviderError } from './draft-provider';
import type { DraftContext } from './draft.service';
import type { AiConfig } from '../../config/ai.config';

const config = { ollamaUrl: 'http://ollama', ollamaModel: 'local', contextLength: 1024, temperature: 0.2, keepAlive: 0, maxConcurrency: 1, ollamaEmbeddingModel: 'embed', ragTopK: 4, ragQueryExpansionEnabled: false, ragRerankEnabled: false, ragRerankModel: 'rank', ragChunkSize: 700, ragChunkOverlap: 100, openAiApiKey: 'test-key', openAiDefaultModel: 'gpt-test' } as AiConfig;
const context: DraftContext = { email: { fromAddress: 'x@example.com', subject: 'Question', normalizedBody: 'Hello' }, classification: { spam: false, needsReply: true, language: 'en' as const, intent: 'other' as const, confidence: 0.9, reason: '' }, contact: null, knowledge: [] };

test('OpenAI adapter generates deterministic draft fields from body text', async () => {
  const client = new OpenAiDraftClient({ config, fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { content: 'Thanks for your message.' } }] }), { status: 200 }) });
  const draft = await client.generateDraft(context);
  assert.equal(draft.body, 'Thanks for your message.');
  assert.equal(draft.replyLanguage, 'en');
});

test('OpenAI adapter maps missing credentials to manual-processing error', async () => {
  const client = new OpenAiDraftClient({ config: { ...config, openAiApiKey: '' }, fetchImpl: async () => { throw new Error('must not call'); } });
  await assert.rejects(() => client.generateDraft(context), (error: unknown) => error instanceof Error && (error as DraftProviderError).code === 'PROVIDER_NOT_CONFIGURED');
});

test('OpenAI adapter reports token usage and duration via onMetric', async () => {
  const metrics: Array<{ durationMs: number; callCount: number; promptTokens?: number; completionTokens?: number; totalTokens?: number }> = [];
  const client = new OpenAiDraftClient({
    config, onMetric: (metric) => metrics.push(metric),
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: 'Thanks for your message.' } }],
      usage: { prompt_tokens: 340, completion_tokens: 52, total_tokens: 392 },
    }), { status: 200 }),
  });
  await client.generateDraft(context);
  assert.equal(metrics.length, 1);
  assert.equal(metrics[0].callCount, 1);
  assert.equal(metrics[0].promptTokens, 340);
  assert.equal(metrics[0].completionTokens, 52);
  assert.equal(metrics[0].totalTokens, 392);
  assert.ok(metrics[0].durationMs >= 0);
});

test('OpenAI adapter exposes its own context length, not the local model one', () => {
  assert.equal(new OpenAiDraftClient({ config: { ...config, openAiContextLength: 32000 } }).contextLength, 32000);
  assert.equal(new OpenAiDraftClient({ config }).contextLength, 16000);
});
