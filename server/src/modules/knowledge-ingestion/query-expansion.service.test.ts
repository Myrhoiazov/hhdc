import assert from 'node:assert/strict';
import test from 'node:test';
import { OllamaQueryExpansionClient, parseExpansionResponse } from './query-expansion.service';

test('parseExpansionResponse parses plain valid JSON', () => {
    const result = parseExpansionResponse('{"clean_query": "цена абонемента", "keywords": ["цена", "абонемент"]}');
    assert.deepEqual(result, { cleanQuery: 'цена абонемента', keywords: ['цена', 'абонемент'] });
});

test('parseExpansionResponse strips a markdown code fence', () => {
    const result = parseExpansionResponse('```json\n{"clean_query": "x", "keywords": ["a"]}\n```');
    assert.deepEqual(result, { cleanQuery: 'x', keywords: ['a'] });
});

test('parseExpansionResponse extracts JSON embedded in explanatory prose', () => {
    const result = parseExpansionResponse('Конечно! Вот результат: {"clean_query": "x", "keywords": ["a", "b"]} Надеюсь, это поможет.');
    assert.deepEqual(result, { cleanQuery: 'x', keywords: ['a', 'b'] });
});

test('parseExpansionResponse accepts keywords as a comma-separated string', () => {
    const result = parseExpansionResponse('{"clean_query": "x", "keywords": "a, b, c"}');
    assert.deepEqual(result, { cleanQuery: 'x', keywords: ['a', 'b', 'c'] });
});

test('parseExpansionResponse returns null for garbage input', () => {
    assert.equal(parseExpansionResponse('not json at all'), null);
    assert.equal(parseExpansionResponse(''), null);
    assert.equal(parseExpansionResponse('   '), null);
});

test('parseExpansionResponse returns null when both fields are empty', () => {
    assert.equal(parseExpansionResponse('{"clean_query": "", "keywords": []}'), null);
});

const config = {
    ollamaUrl: 'http://ollama:11434/',
    ollamaModel: 'test-model',
    contextLength: 1024,
    temperature: 0.2,
    keepAlive: 0,
    maxConcurrency: 1,
    ollamaEmbeddingModel: '',
    ragTopK: 4,
    ragQueryExpansionEnabled: true,
    ragRerankEnabled: false,
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

test('OllamaQueryExpansionClient returns the parsed expansion on success', async () => {
    const client = new OllamaQueryExpansionClient({
        config,
        fetchImpl: async () => new Response(JSON.stringify({ response: '{"clean_query": "цена", "keywords": ["цена", "абонемент"]}' }), { status: 200 }),
    });
    const result = await client.expand('сколько стоит абонемент');
    assert.deepEqual(result, { cleanQuery: 'цена', keywords: ['цена', 'абонемент'] });
});

test('OllamaQueryExpansionClient falls back to the original query and local keywords on a non-2xx response', async () => {
    const client = new OllamaQueryExpansionClient({
        config,
        fetchImpl: async () => new Response('error', { status: 500 }),
    });
    const result = await client.expand('сколько стоит абонемент');
    assert.equal(result.cleanQuery, 'сколько стоит абонемент');
    assert.ok(result.keywords.length > 0);
});

test('OllamaQueryExpansionClient falls back on a network error', async () => {
    const client = new OllamaQueryExpansionClient({
        config,
        fetchImpl: async () => { throw new Error('network down'); },
    });
    const result = await client.expand('пробное занятие');
    assert.equal(result.cleanQuery, 'пробное занятие');
    assert.deepEqual(result.keywords, ['пробное', 'занятие']);
});

test('OllamaQueryExpansionClient falls back when the model output cannot be parsed', async () => {
    const client = new OllamaQueryExpansionClient({
        config,
        fetchImpl: async () => new Response(JSON.stringify({ response: 'I cannot help with that.' }), { status: 200 }),
    });
    const result = await client.expand('где вы находитесь');
    assert.equal(result.cleanQuery, 'где вы находитесь');
});

test('expand reports token usage and duration via onMetric on success', async () => {
    const metrics: Array<{ durationMs: number; promptTokens?: number; completionTokens?: number; totalTokens?: number }> = [];
    const client = new OllamaQueryExpansionClient({
        config, onMetric: (metric) => metrics.push(metric),
        fetchImpl: async () => new Response(JSON.stringify({
            response: JSON.stringify({ clean_query: 'цена абонемента', keywords: ['цена', 'абонемент'] }),
            prompt_eval_count: 80, eval_count: 20,
        }), { status: 200 }),
    });
    await client.expand('Сколько стоит абонемент?');
    assert.equal(metrics.length, 1);
    assert.equal(metrics[0].promptTokens, 80);
    assert.equal(metrics[0].completionTokens, 20);
    assert.equal(metrics[0].totalTokens, 100);
});

test('expand emits no metric when the HTTP call throws (network error)', async () => {
    const metrics: unknown[] = [];
    const client = new OllamaQueryExpansionClient({
        config, onMetric: (metric) => metrics.push(metric),
        fetchImpl: async () => { throw new Error('network down'); },
    });
    const result = await client.expand('query');
    assert.equal(result.cleanQuery, 'query');
    assert.equal(metrics.length, 0);
});

test('expand emits no metric when the HTTP response is non-2xx', async () => {
    const metrics: unknown[] = [];
    const client = new OllamaQueryExpansionClient({
        config, onMetric: (metric) => metrics.push(metric),
        fetchImpl: async () => new Response('error', { status: 500 }),
    });
    const result = await client.expand('query');
    assert.equal(result.cleanQuery, 'query');
    assert.equal(metrics.length, 0);
});
