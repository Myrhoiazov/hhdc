import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKnowledgeDocumentV2 } from './kb-document';
import { indexKnowledgeBaseV2, planKnowledgeIndex } from './kb-indexer';
import type { EmbeddedChunkV2, IndexedDocumentV2, KbV2Store } from './kb-v2.repository';

const documentA = buildKnowledgeDocumentV2('08_faq/a.md', '# A\n\n## Q1\n\nAnswer one.\n\n## Q2\n\nAnswer two.');
const documentB = buildKnowledgeDocumentV2('08_faq/b.md', '# B\n\nSingle answer.');
const MODEL = 'bge-m3';

const indexedRow = (sourceId: string, contentHash: string, embeddingModel = MODEL): IndexedDocumentV2 => ({ sourceId, contentHash, embeddingModel });

test('incremental plan re-embeds only new/changed documents and removes deleted ones', () => {
    const plan = planKnowledgeIndex([documentA, documentB], [indexedRow('faq_a', documentA.contentHash), indexedRow('faq_b', 'old-hash'), indexedRow('faq_removed', 'x')], { embeddingModel: MODEL, full: false });
    assert.deepEqual(plan.unchanged.map((document) => document.metadata.id), ['faq_a']);
    assert.deepEqual(plan.toIndex.map((document) => document.metadata.id), ['faq_b']);
    assert.deepEqual(plan.toRemove, ['faq_removed']);
});

test('an embedding-model change or a full reindex re-embeds unchanged documents too', () => {
    assert.equal(planKnowledgeIndex([documentA], [indexedRow('faq_a', documentA.contentHash, 'other-model')], { embeddingModel: MODEL, full: false }).toIndex.length, 1);
    assert.equal(planKnowledgeIndex([documentA], [indexedRow('faq_a', documentA.contentHash)], { embeddingModel: MODEL, full: true }).toIndex.length, 1);
});

const createFakeStore = (indexed: IndexedDocumentV2[]) => {
    const calls: string[] = [];
    const replaced: Array<{ id: string; chunks: EmbeddedChunkV2[] }> = [];
    const store: KbV2Store = {
        listIndexedDocuments: async () => indexed,
        replaceDocument: async ({ document, chunks }) => { calls.push(`replace:${document.metadata.id}`); replaced.push({ id: document.metadata.id, chunks }); },
        removeDocuments: async (sourceIds) => { calls.push(`remove:${sourceIds.join(',')}`); return sourceIds.length; },
        listActiveChunks: async () => [],
    };
    return { store, calls, replaced };
};

test('indexing embeds every chunk, persists per document and removes stale documents last', async () => {
    const fake = createFakeStore([indexedRow('faq_gone', 'x')]);
    const result = await indexKnowledgeBaseV2([documentA, documentB], { embeddings: { embed: async (text) => [text.length, 1] }, store: fake.store, embeddingModel: MODEL }, { full: false });
    assert.deepEqual(result, { indexed: 2, unchanged: 0, removed: 1, chunks: 3, failed: [] });
    assert.deepEqual(fake.calls, ['replace:faq_a', 'replace:faq_b', 'remove:faq_gone']);
    assert.equal(fake.replaced[0].chunks[0].embedding.length, 2);
});

test('an embedding failure is reported per document without aborting the rest', async () => {
    const fake = createFakeStore([]);
    const embeddings = { embed: async (text: string) => { if (text.startsWith('A')) throw new Error('ollama down'); return [1]; } };
    const result = await indexKnowledgeBaseV2([documentA, documentB], { embeddings, store: fake.store, embeddingModel: MODEL }, { full: false });
    assert.deepEqual(result.failed, [{ documentId: 'faq_a', message: 'ollama down' }]);
    assert.equal(result.indexed, 1);
    assert.deepEqual(fake.calls, ['replace:faq_b', 'remove:']);
});
