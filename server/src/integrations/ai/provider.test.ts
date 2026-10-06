import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { createAiProvider } from './provider';

test('AI adapter mocked structured output', async () => {
    const provider = createAiProvider({ provider: 'OLLAMA', model: 'test-model', credentials: {} });
    const res = await provider.generateStructured('Message', { schema: z.object({ confidence: z.number().min(0).max(1) }) });
    assert.deepEqual(res, {});
});
