import test from 'node:test';
import assert from 'node:assert/strict';
import { updateRuntimeSettingsSchema } from './runtime-settings.controller';
import { DRAFT_PROVIDERS } from './draft-provider';

test('runtime settings schema accepts provider and model', () => {
  assert.deepEqual(updateRuntimeSettingsSchema.parse({ provider: DRAFT_PROVIDERS.OPENAI, model: 'gpt-test' }), { provider: 'OPENAI', model: 'gpt-test' });
});
test('runtime settings schema rejects empty model', () => {
  assert.equal(updateRuntimeSettingsSchema.safeParse({ provider: 'OPENAI', model: '' }).success, false);
});
