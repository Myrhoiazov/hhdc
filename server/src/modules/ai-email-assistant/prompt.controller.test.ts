import assert from 'node:assert/strict';
import test from 'node:test';
import { AiPromptSlot } from '@prisma/client';
import { createPromptSchema, updatePromptSchema } from './prompt.controller';

test('createPromptSchema requires slot/name/content', () => {
    assert.equal(createPromptSchema.safeParse({}).success, false);
    assert.equal(createPromptSchema.safeParse({ slot: AiPromptSlot.DRAFT_BODY, name: 'x' }).success, false);
});

test('createPromptSchema rejects an unknown slot', () => {
    assert.equal(createPromptSchema.safeParse({ slot: 'NOT_A_SLOT', name: 'x', content: 'y' }).success, false);
});

test('createPromptSchema parses a comma-separated tags string and accepts an array', () => {
    const fromString = createPromptSchema.safeParse({ slot: AiPromptSlot.CLASSIFICATION, name: 'v2', content: 'text', tags: 'a, b ,, c' });
    assert.equal(fromString.success, true);
    if (fromString.success) assert.deepEqual(fromString.data.tags, ['a', 'b', 'c']);

    const fromArray = createPromptSchema.safeParse({ slot: AiPromptSlot.CLASSIFICATION, name: 'v2', content: 'text', tags: ['a', ' b '] });
    assert.equal(fromArray.success, true);
    if (fromArray.success) assert.deepEqual(fromArray.data.tags, ['a', 'b']);
});

test('createPromptSchema defaults tags to an empty array', () => {
    const result = createPromptSchema.safeParse({ slot: AiPromptSlot.DRAFT_BODY, name: 'v1', content: 'text' });
    assert.equal(result.success, true);
    if (result.success) assert.deepEqual(result.data.tags, []);
});

test('updatePromptSchema allows a partial update (name only)', () => {
    const result = updatePromptSchema.safeParse({ name: 'renamed' });
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.content, undefined);
});

test('updatePromptSchema rejects an empty content string', () => {
    assert.equal(updatePromptSchema.safeParse({ content: '' }).success, false);
});
