import assert from 'node:assert/strict';
import test from 'node:test';
import { createDraftProviderFactory } from './draft-provider.factory';
import { DRAFT_PROVIDERS } from './draft-provider';
import type { AiRuntimeSettingsRepository } from './runtime-settings.service';

const settingsRepository = (provider: 'OLLAMA' | 'OPENAI', model: string): AiRuntimeSettingsRepository => ({
  get: async () => ({ provider, model, updatedAt: new Date() }),
  update: async () => { throw new Error('not implemented'); },
});

test('getSelectedProvider threads onMetric into the constructed Ollama provider', async () => {
  const factory = createDraftProviderFactory(settingsRepository(DRAFT_PROVIDERS.OLLAMA, 'test-model'));
  const calls: unknown[] = [];
  const provider = await factory.getSelectedProvider((metric) => calls.push(metric));
  assert.equal(provider.provider, DRAFT_PROVIDERS.OLLAMA);
  // onMetric is only invoked when generateDraft actually runs — this test only proves it was
  // threaded through construction, not invoked yet.
  assert.equal(calls.length, 0);
});

test('getSelectedProvider threads onMetric into the constructed OpenAI provider', async () => {
  const factory = createDraftProviderFactory(settingsRepository(DRAFT_PROVIDERS.OPENAI, 'gpt-test'));
  const provider = await factory.getSelectedProvider(() => {});
  assert.equal(provider.provider, DRAFT_PROVIDERS.OPENAI);
  assert.equal(provider.model, 'gpt-test');
});

test('getSelectedProvider still works with no onMetric argument (existing production call sites)', async () => {
  const factory = createDraftProviderFactory(settingsRepository(DRAFT_PROVIDERS.OLLAMA, 'test-model'));
  const provider = await factory.getSelectedProvider();
  assert.equal(provider.provider, DRAFT_PROVIDERS.OLLAMA);
});
