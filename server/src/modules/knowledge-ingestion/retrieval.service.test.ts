import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryKnowledgeRepository } from './embedding.service';
import { KnowledgeRetrievalService } from './retrieval.service';

test('retrieval applies score threshold, deduplicates document versions and limits topK', async () => {
    const repository = new InMemoryKnowledgeRepository();
    await repository.upsertChunks([
        { id: 'a1', documentId: 'a', sourceUrl: 'a', contentHash: 'v1', ordinal: 0, content: 'one', embedding: [1, 0] },
        { id: 'a2', documentId: 'a', sourceUrl: 'a', contentHash: 'v1', ordinal: 1, content: 'two', embedding: [0.99, 0.01] },
        { id: 'b1', documentId: 'b', sourceUrl: 'b', contentHash: 'v1', ordinal: 0, content: 'three', embedding: [0.8, 0.2] },
        { id: 'c1', documentId: 'c', sourceUrl: 'c', contentHash: 'v1', ordinal: 0, content: 'weak', embedding: [0, 1] },
    ]);
    const service = new KnowledgeRetrievalService({ embed: async () => [1, 0] }, repository);
    const results = await service.retrieve('query', { topK: 2, minimumScore: 0.7 });
    assert.deepEqual(results.map((result) => result.id), ['a1', 'b1']);
});

test('reports a single duration-only metric for the query embedding call', async () => {
    const repository = new InMemoryKnowledgeRepository();
    await repository.upsertChunks([
        { id: 'a1', documentId: 'a', sourceUrl: 'a', contentHash: 'v1', ordinal: 0, content: 'one', embedding: [1, 0] },
    ]);
    const metrics: Array<{ durationMs: number }> = [];
    const service = new KnowledgeRetrievalService({ embed: async () => [1, 0] }, repository, {
        onMetric: (metric) => metrics.push(metric),
    });
    await service.retrieve('query', { topK: 2, minimumScore: 0.5 });
    assert.equal(metrics.length, 1);
    assert.ok(metrics[0].durationMs >= 0);
});

test('hybrid BM25+RRF fusion can promote a lower-cosine chunk that matches the query terms', async () => {
    const repository = new InMemoryKnowledgeRepository();
    await repository.upsertChunks([
        // Higher cosine similarity (1.0) but no term overlap with the query text.
        { id: 'x1', documentId: 'x', sourceUrl: 'x', contentHash: 'v1', ordinal: 0, content: 'танцы', embedding: [1, 0] },
        // Slightly lower cosine (~0.994) but matches both query terms — BM25 should promote it.
        { id: 'x2', documentId: 'x2', sourceUrl: 'x2', contentHash: 'v1', ordinal: 0, content: 'пробное занятие для детей', embedding: [0.9, 0.1] },
    ]);
    const service = new KnowledgeRetrievalService({ embed: async () => [1, 0] }, repository);
    const results = await service.retrieve('пробное занятие', { topK: 2, minimumScore: 0.5 });
    assert.deepEqual(results.map((result) => result.id), ['x2', 'x1']);
    // The returned score is still the plain cosine similarity, not an RRF/BM25 score — downstream
    // confidence math (ollama.client.ts) depends on this remaining a 0-1 cosine value.
    assert.ok(results[0].score > 0.9 && results[0].score < 1);
});

test('falls back to plain vector-rank order when the query shares no term with any qualifying chunk', async () => {
    const repository = new InMemoryKnowledgeRepository();
    await repository.upsertChunks([
        { id: 'a1', documentId: 'a', sourceUrl: 'a', contentHash: 'v1', ordinal: 0, content: 'один', embedding: [1, 0] },
        { id: 'b1', documentId: 'b', sourceUrl: 'b', contentHash: 'v1', ordinal: 0, content: 'два', embedding: [0.95, 0.05] },
    ]);
    const service = new KnowledgeRetrievalService({ embed: async () => [1, 0] }, repository);
    const results = await service.retrieve('zzzznonexistentword', { topK: 2, minimumScore: 0.5 });
    assert.deepEqual(results.map((result) => result.id), ['a1', 'b1']);
});
