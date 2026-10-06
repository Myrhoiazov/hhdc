import assert from 'node:assert/strict';
import test from 'node:test';
import { indexKnowledgeSources } from './sync.service';
import type { SourceDocumentRef } from './knowledge-ingestion.service';

test('sync reports embedding failures, uses HTML fallback and continues without persisting empty documents', async () => {
    const refs: SourceDocumentRef[] = ['broken', 'good', 'empty'].map(sourceId => ({ sourceId, sourceType: 'wordpress', sourceUrl: `https://example.com/${sourceId}` }));
    const saved: string[] = [];
    const result = await indexKnowledgeSources(refs, {
        source: { async fetch(ref) { return { ref, title: ref.sourceId, html: '' }; } },
        fallback: { async fetch(ref) { return { ref, title: ref.sourceId, html: ref.sourceId === 'empty' ? '' : `<p>${ref.sourceId}</p>` }; } },
        embeddings: { async embed(text) {
            if (text === 'broken') throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });
            return [1, 0];
        } },
        repository: { async persistDocument(input) { saved.push(input.document.sourceId); } },
    });
    assert.deepEqual(saved, ['good']);
    assert.deepEqual(result, { indexed: 1, chunks: 1, skipped: 1, failed: 1, failures: [{ sourceId: 'broken', stage: 'embedding', code: 'ECONNREFUSED' }] });
});

test('sync identifies persistence failures separately from downloading', async () => {
    const ref: SourceDocumentRef = { sourceType: 'website', sourceId: 'page', sourceUrl: 'https://example.com/page' };
    const result = await indexKnowledgeSources([ref], {
        source: { async fetch(ref) { return { ref, title: 'Page', html: '<p>Dance classes</p>' }; } },
        embeddings: { async embed() { return [1, 0]; } },
        repository: { async persistDocument() { throw Object.assign(new Error('Database failure'), { code: 'P2003' }); } },
    });
    assert.equal(result.indexed, 0);
    assert.deepEqual(result.failures, [{ sourceId: 'page', stage: 'persist', code: 'P2003' }]);
});
