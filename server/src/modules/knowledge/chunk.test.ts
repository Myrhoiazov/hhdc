import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkKnowledge } from './chunk';

test('knowledge chunking preserves the end of a long event policy', () => {
    const content = `${'Event policy. '.repeat(200)}Final refund rule.`;
    const chunks = chunkKnowledge(content);
    assert.ok(chunks.length > 1);
    assert.ok(chunks.every(chunk => chunk.length <= 1200));
    assert.ok(chunks.at(-1)?.endsWith('Final refund rule.'));
});
