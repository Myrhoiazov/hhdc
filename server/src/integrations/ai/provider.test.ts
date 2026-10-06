import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { OllamaProvider } from './ollama.provider';
import { OpenAiProvider } from './openai.provider';

type Call = { url: string; body: any; headers: Record<string, string> };
const fakeFetch = (reply: unknown, calls: Call[], status = 200) => (async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)), headers: init.headers as Record<string, string> });
    return new Response(JSON.stringify(reply), { status });
}) as unknown as typeof fetch;

const schema = z.object({ confidence: z.number().min(0).max(1) });

test('OpenAI adapter requests JSON mode and validates structured output against the schema', async () => {
    const calls: Call[] = [];
    const provider = new OpenAiProvider('gpt-test', { apiKey: 'test-key' }, fakeFetch({ choices: [{ message: { content: '{"confidence":0.8}' } }] }, calls));
    assert.deepEqual(await provider.generateStructured('Message', { schema }), { confidence: 0.8 });
    assert.equal(calls[0].url, 'https://api.openai.com/v1/chat/completions');
    assert.deepEqual(calls[0].body.response_format, { type: 'json_object' });
    assert.equal(calls[0].headers.authorization, 'Bearer test-key');
});

test('structured output that violates the schema is rejected instead of being trusted', async () => {
    const provider = new OpenAiProvider('gpt-test', { apiKey: 'test-key' }, fakeFetch({ choices: [{ message: { content: '{"confidence":7}' } }] }, []));
    await assert.rejects(provider.generateStructured('Message', { schema }));
});

test('OpenAI adapter refuses to call the API without a key and hides provider error bodies', async () => {
    await assert.rejects(new OpenAiProvider('gpt-test', {}, fakeFetch({}, [])).generateText('Hi'), /API key/);
    const failing = new OpenAiProvider('gpt-test', { apiKey: 'test-key' }, fakeFetch({ error: 'prompt echo' }, [], 500));
    await assert.rejects(failing.generateText('Hi'), /^Error: OpenAI request failed \(500\)$/);
});

test('OpenAI embeddings are returned in input order', async () => {
    const reply = { data: [{ index: 1, embedding: [2] }, { index: 0, embedding: [1] }] };
    assert.deepEqual(await new OpenAiProvider('embed', { apiKey: 'test-key' }, fakeFetch(reply, [])).embed(['a', 'b']), [[1], [2]]);
});

test('Ollama adapter sends the system prompt and parses chat and embedding responses', async () => {
    const calls: Call[] = [];
    const chat = new OllamaProvider('llama-test', { baseUrl: 'http://ollama.test/' }, fakeFetch({ message: { content: 'Hello' } }, calls));
    assert.equal(await chat.generateText('Hi', 'Be brief'), 'Hello');
    assert.equal(calls[0].url, 'http://ollama.test/api/chat');
    assert.deepEqual(calls[0].body.messages, [{ role: 'system', content: 'Be brief' }, { role: 'user', content: 'Hi' }]);
    const embedder = new OllamaProvider('embed', { baseUrl: 'http://ollama.test' }, fakeFetch({ embeddings: [[0.1, 0.2]] }, []));
    assert.deepEqual(await embedder.embed(['a']), [[0.1, 0.2]]);
});
