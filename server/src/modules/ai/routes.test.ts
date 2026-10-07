import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../../common/http';
import { draftSelection } from './routes';

const connectionId = '2c81a8b8-1556-47af-96fd-0be50e6d8561';

test('a draft uses the provider model unless someone who manages AI picks another one', () => {
    assert.deepEqual(draftSelection(undefined, ['ai.use']), { ai: undefined, draftPromptId: undefined });
    assert.deepEqual(draftSelection({}, ['ai.use']), { ai: undefined, draftPromptId: undefined });
    assert.deepEqual(draftSelection({ providerConnectionId: connectionId, model: 'gpt-4o-mini' }, ['ai.use', 'ai.manage']).ai, { connectionId, model: 'gpt-4o-mini' });
    assert.deepEqual(draftSelection({ model: 'qwen3:4b' }, ['ai.manage']).ai, { connectionId: undefined, model: 'qwen3:4b' });
    assert.deepEqual(draftSelection({ draftPromptId: connectionId }, ['ai.manage']), { ai: undefined, draftPromptId: connectionId });
});

test('choosing a model without the AI management permission is refused', () => {
    assert.throws(() => draftSelection({ model: 'gpt-4o-mini' }, ['ai.use']), (error: unknown) => error instanceof ApiError && error.status === 403);
    assert.throws(() => draftSelection({ draftPromptId: connectionId }, ['ai.use']), (error: unknown) => error instanceof ApiError && error.status === 403);
    assert.throws(() => draftSelection({ model: '', extra: true }, ['ai.manage']));
});
