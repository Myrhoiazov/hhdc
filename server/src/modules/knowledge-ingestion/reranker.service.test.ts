import assert from 'node:assert/strict';
import test from 'node:test';
import { OllamaReranker } from './reranker.service';
import type { ScoredKnowledgeChunk } from './embedding.service';

const config = {
    ollamaUrl: 'http://ollama:11434/',
    ollamaModel: 'test-model',
    contextLength: 1024,
    temperature: 0.2,
    keepAlive: 0,
    maxConcurrency: 1,
    ollamaEmbeddingModel: '',
    ragTopK: 4,
    ragQueryExpansionEnabled: false,
    ragRerankEnabled: true,
    ragRerankModel: 'test-reranker',
    ragChunkSize: 700,
    ragChunkOverlap: 100,
    ragVersion: 'v1' as const,
    ragKnowledgePath: 'knowledge/ddc-knowledge-v2',
    ragRuleLimit: 3,
    ragFactLimit: 4,
    ragFaqLimit: 2,
    ragExampleLimit: 2,
};

const candidates: ScoredKnowledgeChunk[] = [
    { id: 'a', documentId: 'a', sourceUrl: 'a', contentHash: 'v1', ordinal: 0, content: 'first', score: 0.9 },
    { id: 'b', documentId: 'b', sourceUrl: 'b', contentHash: 'v1', ordinal: 0, content: 'second', score: 0.8 },
];

test('returns candidates unchanged when the list is empty', async () => {
    const reranker = new OllamaReranker({ embed: async () => [1, 0] }, { config });
    assert.deepEqual(await reranker.rerank('q', [], 5), []);
});

test('reorders by the native /api/rerank endpoint and never overwrites the cosine score', async () => {
    const reranker = new OllamaReranker({ embed: async () => [1, 0] }, {
        config,
        fetchImpl: async () => new Response(JSON.stringify({ results: [{ index: 1, relevance_score: 0.99 }, { index: 0, relevance_score: 0.1 }] }), { status: 200 }),
    });
    const result = await reranker.rerank('q', candidates, 5);
    assert.deepEqual(result.map((chunk) => chunk.id), ['b', 'a']);
    // score field must remain the original cosine similarity, not the relevance_score
    assert.equal(result[0].score, 0.8);
});

test('falls back to bi-encoder similarity when the native endpoint is unavailable', async () => {
    const embeddings = new Map([['q', [1, 0]], ['first', [0, 1]], ['second', [1, 0]]]);
    const reranker = new OllamaReranker(
        { embed: async (text: string) => embeddings.get(text) ?? [0, 0] },
        { config, fetchImpl: async () => new Response('not found', { status: 404 }) },
    );
    const result = await reranker.rerank('q', candidates, 5);
    // "second" has identical embedding to the query (similarity 1), "first" is orthogonal (similarity 0)
    assert.deepEqual(result.map((chunk) => chunk.id), ['b', 'a']);
});

test('keeps the original (RRF) order when both the native endpoint and the embedding fallback fail', async () => {
    const reranker = new OllamaReranker(
        { embed: async () => { throw new Error('embedding service down'); } },
        { config, fetchImpl: async () => { throw new Error('network down'); } },
    );
    const result = await reranker.rerank('q', candidates, 5);
    assert.deepEqual(result.map((chunk) => chunk.id), ['a', 'b']);
});

test('respects topK on both the native and fallback paths', async () => {
    const nativeReranker = new OllamaReranker({ embed: async () => [1, 0] }, {
        config,
        fetchImpl: async () => new Response(JSON.stringify({ results: [{ index: 0, relevance_score: 0.5 }, { index: 1, relevance_score: 0.9 }] }), { status: 200 }),
    });
    assert.equal((await nativeReranker.rerank('q', candidates, 1)).length, 1);
});

test('emits exactly one metric for the native rerank path, tagged nativeRerankUsed:true', async () => {
    const metrics: Array<{ callCount: number; model: string; meta: { nativeRerankUsed: boolean; candidateCount: number } }> = [];
    const reranker = new OllamaReranker({ embed: async () => [1, 0] }, {
        config, onMetric: (metric) => metrics.push(metric),
        fetchImpl: async () => new Response(JSON.stringify({ results: [{ index: 0, relevance_score: 0.5 }, { index: 1, relevance_score: 0.9 }] }), { status: 200 }),
    });
    await reranker.rerank('q', candidates, 5);
    assert.equal(metrics.length, 1);
    assert.equal(metrics[0].callCount, 1);
    assert.equal(metrics[0].model, config.ragRerankModel);
    assert.deepEqual(metrics[0].meta, { nativeRerankUsed: true, candidateCount: 2 });
});

test('emits exactly one aggregated metric when native fails and the bi-encoder fallback runs', async () => {
    const metrics: Array<{ callCount: number; model: string; meta: { nativeRerankUsed: boolean; candidateCount: number } }> = [];
    const embeddings = new Map([['q', [1, 0]], ['first', [0, 1]], ['second', [1, 0]]]);
    const reranker = new OllamaReranker(
        { embed: async (text: string) => embeddings.get(text) ?? [0, 0] },
        { config, onMetric: (metric) => metrics.push(metric), fetchImpl: async () => new Response('not found', { status: 404 }) },
    );
    await reranker.rerank('q', candidates, 5);
    assert.equal(metrics.length, 1);
    // callCount = 1 query embed + 1 embed per candidate
    assert.equal(metrics[0].callCount, 3);
    assert.equal(metrics[0].model, config.ollamaEmbeddingModel);
    assert.deepEqual(metrics[0].meta, { nativeRerankUsed: false, candidateCount: 2 });
});

test('emits no metric when both the native endpoint and the embedding fallback fail', async () => {
    const metrics: unknown[] = [];
    const reranker = new OllamaReranker(
        { embed: async () => { throw new Error('embedding service down'); } },
        { config, onMetric: (metric) => metrics.push(metric), fetchImpl: async () => { throw new Error('network down'); } },
    );
    await reranker.rerank('q', candidates, 5);
    assert.equal(metrics.length, 0);
});
