import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../../common/http';
import { assertCanGenerate, GENERATION_ORDER } from './active-ai';

const refusal = (connection: Parameters<typeof assertCanGenerate>[0]) => {
    try { assertCanGenerate(connection); return null; }
    catch (error) { return error instanceof ApiError ? error.code : 'UNEXPECTED'; }
};

test('a connected AI provider may be chosen to write answers', () => {
    assert.equal(refusal({ type: 'AI', provider: 'OLLAMA', status: 'CONNECTED' }), null);
    assert.equal(refusal({ type: 'AI', provider: 'OPENAI', status: 'CONNECTED' }), null);
});

test('a missing, non-AI or switched-off connection is refused with its own reason', () => {
    assert.equal(refusal(null), 'NOT_FOUND');
    assert.equal(refusal({ type: 'EMAIL', provider: 'IMAP', status: 'CONNECTED' }), 'NOT_AN_AI_PROVIDER');
    assert.equal(refusal({ type: 'AI', provider: 'OLLAMA', status: 'DISABLED' }), 'AI_PROVIDER_NOT_CONNECTED');
});

test('the chosen provider answers first and the oldest one stands in for it', () => {
    assert.deepEqual(GENERATION_ORDER, [{ activeForGeneration: 'desc' }, { createdAt: 'asc' }]);
});
