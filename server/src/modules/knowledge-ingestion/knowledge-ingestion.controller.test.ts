import assert from 'node:assert/strict';
import test from 'node:test';
import { KnowledgeCategory } from '@prisma/client';
import { crawlSchema, patchMetadataSchema } from './knowledge-ingestion.controller';

test('crawlSchema requires a url', () => {
    assert.equal(crawlSchema.safeParse({}).success, false);
});

test('crawlSchema defaults category to OTHER and priority to 0', () => {
    const result = crawlSchema.safeParse({ url: 'https://example.com/page' });
    assert.equal(result.success, true);
    if (result.success) {
        assert.equal(result.data.category, KnowledgeCategory.OTHER);
        assert.equal(result.data.priority, 0);
        assert.deepEqual(result.data.tags, []);
    }
});

test('crawlSchema parses a comma-separated tags string', () => {
    const result = crawlSchema.safeParse({ url: 'https://example.com/page', tags: 'a, b ,, c' });
    assert.equal(result.success, true);
    if (result.success) assert.deepEqual(result.data.tags, ['a', 'b', 'c']);
});

test('crawlSchema accepts a tags array directly', () => {
    const result = crawlSchema.safeParse({ url: 'https://example.com/page', tags: ['a', ' b '] });
    assert.equal(result.success, true);
    if (result.success) assert.deepEqual(result.data.tags, ['a', 'b']);
});

test('crawlSchema coerces a string priority and rejects out-of-range values', () => {
    const inRange = crawlSchema.safeParse({ url: 'https://example.com/page', priority: '42' });
    assert.equal(inRange.success, true);
    if (inRange.success) assert.equal(inRange.data.priority, 42);
    assert.equal(crawlSchema.safeParse({ url: 'https://example.com/page', priority: '101' }).success, false);
    assert.equal(crawlSchema.safeParse({ url: 'https://example.com/page', priority: '-1' }).success, false);
});

test('crawlSchema rejects an unknown category', () => {
    assert.equal(crawlSchema.safeParse({ url: 'https://example.com/page', category: 'NOT_A_CATEGORY' }).success, false);
});

test('patchMetadataSchema allows a partial update (category only)', () => {
    const result = patchMetadataSchema.safeParse({ category: KnowledgeCategory.FAQ });
    assert.equal(result.success, true);
    if (result.success) {
        assert.equal(result.data.category, KnowledgeCategory.FAQ);
        assert.equal(result.data.priority, undefined);
    }
});

test('patchMetadataSchema treats an omitted tags field as empty rather than erroring', () => {
    const result = patchMetadataSchema.safeParse({ priority: 5 });
    assert.equal(result.success, true);
    if (result.success) assert.deepEqual(result.data.tags, []);
});
