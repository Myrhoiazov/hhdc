import assert from 'node:assert/strict';
import test from 'node:test';
import { OllamaLlmClient } from './ollama.client';
import { DEFAULT_PROMPT_CONTENT, type AiPromptRepository } from './prompt-library.service';
import type { DraftContext } from './draft.service';

// No AiPrompt row is ever active in these tests — resolves straight to the built-in defaults,
// exactly like a real, freshly-migrated ai_prompts table would, without touching Prisma/MySQL.
const fakePromptRepository: AiPromptRepository = {
    list: async () => [],
    getActiveContent: async (slot) => DEFAULT_PROMPT_CONTENT[slot],
    getContentById: async () => null,
    getNameById: async () => null,
    create: async () => { throw new Error('not implemented in fakePromptRepository'); },
    update: async () => { throw new Error('not implemented in fakePromptRepository'); },
    activate: async () => { throw new Error('not implemented in fakePromptRepository'); },
    remove: async () => { throw new Error('not implemented in fakePromptRepository'); },
};

const input = {
    fromAddress: 'parent@example.com',
    subject: 'Proefles',
    normalizedBody: 'Kan mijn dochter een proefles volgen?',
};

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

test('Ollama client uses configured model and validates structured output', async () => {
    const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
    const client = new OllamaLlmClient({
        config,
        promptRepository: fakePromptRepository,
        fetchImpl: async (url, init) => {
            requests.push({ url: String(url), body: JSON.parse(String(init?.body)) });
            return new Response(JSON.stringify({ response: JSON.stringify({
                spam: false,
                needsReply: true,
                language: 'nl',
                intent: 'trial_lesson',
                confidence: 0.9,
                reason: 'Vraag over een proefles.',
            }) }), { status: 200 });
        },
    });

    const result = await client.classifyEmail(input);

    assert.equal(result.intent, 'trial_lesson');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'http://ollama:11434/api/generate');
    assert.equal(requests[0].body.model, 'test-model');
});

test('classification prompt gives explicit needsReply criteria', async () => {
    // Regression guard: needsReply was empirically always false from qwen3 without this
    // guidance, live on real customer emails (see tasks/plan.md Task 18) — the field name alone
    // gave the model nothing to reason from.
    const requests: Array<{ body: Record<string, unknown> }> = [];
    const client = new OllamaLlmClient({
        config,
        promptRepository: fakePromptRepository,
        fetchImpl: async (_url, init) => {
            requests.push({ body: JSON.parse(String(init?.body)) });
            return new Response(JSON.stringify({ response: JSON.stringify({
                spam: false, needsReply: true, language: 'nl', intent: 'trial_lesson', confidence: 0.9, reason: 'test',
            }) }), { status: 200 });
        },
    });
    await client.classifyEmail(input);
    assert.match(String(requests[0].body.prompt), /reply is needed whenever the sender asks a question/i);
});

test('Ollama client performs one repair retry for invalid JSON', async () => {
    let calls = 0;
    const client = new OllamaLlmClient({
        config,
        promptRepository: fakePromptRepository,
        fetchImpl: async () => {
            calls += 1;
            const response = calls === 1 ? 'not json' : JSON.stringify({
                spam: false,
                needsReply: false,
                language: 'en',
                intent: 'other',
                confidence: 0.5,
                reason: 'No reply needed.',
            });
            return new Response(JSON.stringify({ response }), { status: 200 });
        },
    });

    const result = await client.classifyEmail(input);

    assert.equal(calls, 2);
    assert.equal(result.language, 'en');
});

const draftContext: DraftContext = {
    email: input,
    classification: { spam: false, needsReply: true, language: 'nl', intent: 'trial_lesson', confidence: 0.9, reason: 'Vraag over een proefles.' },
    contact: null,
    knowledge: [
        { id: 'kb-1', sourceUrl: 'https://example.com/faq', content: 'Ja, een proefles is mogelijk.', score: 0.7 },
        { id: 'kb-2', sourceUrl: 'https://example.com/styles', content: 'Hip-Hop, Contemporary, Jazz Funk.', score: 0.6 },
    ],
};

// Only the body is model-generated now (tasks/plan.md Task 22) — every other EmailDraft field is
// computed deterministically, so it can never fail schema/language validation regardless of what
// the model returns as long as it returns some non-empty text.

test('generateDraft asks the model for body text only, with reasoning disabled', async () => {
    const requests: Array<{ body: Record<string, unknown> }> = [];
    const client = new OllamaLlmClient({
        config,
        promptRepository: fakePromptRepository,
        fetchImpl: async (_url, init) => {
            requests.push({ body: JSON.parse(String(init?.body)) });
            return new Response(JSON.stringify({ response: 'Ja, dat kan zeker.' }), { status: 200 });
        },
    });

    await client.generateDraft(draftContext);

    assert.equal(requests.length, 1);
    assert.equal(requests[0].body.think, false);
    assert.doesNotMatch(String(requests[0].body.prompt), /"replyLanguage"|"usedKnowledgeIds"/, 'no JSON schema is requested from the model anymore');
    assert.match(String(requests[0].body.prompt), /никогда не переводи и не перефразируй их/i);
});

test('generateDraft prompt gives the model a consultant persona and tone in Russian', async () => {
    // Regression guard: the prompt was rewritten to establish an identity and tone at the user's
    // explicit request (tasks/plan.md Task 26) — a small model given no persona tends to answer
    // like a generic search summary rather than address the customer directly.
    const requests: Array<{ body: Record<string, unknown> }> = [];
    const client = new OllamaLlmClient({
        config,
        promptRepository: fakePromptRepository,
        fetchImpl: async (_url, init) => {
            requests.push({ body: JSON.parse(String(init?.body)) });
            return new Response(JSON.stringify({ response: 'Ответ.' }), { status: 200 });
        },
    });

    await client.generateDraft(draftContext);

    assert.match(String(requests[0].body.prompt), /помощник-консультант школы танцев Talent Center DDC/);
    assert.match(String(requests[0].body.prompt), /доброжелательный, тёплый и профессиональный/);
});

test('generateDraft fills replyLanguage/subject/usedKnowledgeIds deterministically, not from the model', async () => {
    const client = new OllamaLlmClient({
        config,
        promptRepository: fakePromptRepository,
        // A model reply that is not JSON at all — it doesn't need to be, only the body matters.
        fetchImpl: async () => new Response(JSON.stringify({ response: 'Ja hoor, een proefles kan altijd.' }), { status: 200 }),
    });

    const result = await client.generateDraft(draftContext);

    assert.equal(result.replyLanguage, draftContext.classification.language);
    assert.equal(result.subject, 'Re: Proefles');
    assert.equal(result.body, 'Ja hoor, een proefles kan altijd.');
    assert.deepEqual(result.usedKnowledgeIds, ['kb-1', 'kb-2']);
});

test('generateDraft derives confidence/needsManualAnswer from retrieval scores, not model self-report', async () => {
    const client = new OllamaLlmClient({
        config,
        promptRepository: fakePromptRepository,
        fetchImpl: async () => new Response(JSON.stringify({ response: 'Antwoord.' }), { status: 200 }),
    });

    const confident = await client.generateDraft(draftContext); // top score 0.7
    assert.equal(confident.needsManualAnswer, false);
    assert.equal(confident.confidence, 0.7);

    const weakContext: DraftContext = { ...draftContext, knowledge: [{ id: 'kb-3', sourceUrl: 'https://example.com/x', content: 'weak match', score: 0.2 }] };
    const weak = await client.generateDraft(weakContext);
    assert.equal(weak.needsManualAnswer, true);

    const noKnowledgeContext: DraftContext = { ...draftContext, knowledge: [] };
    const noKnowledge = await client.generateDraft(noKnowledgeContext);
    assert.equal(noKnowledge.needsManualAnswer, true);
});

test('generateDraft retries once on an empty body and fails after that', async () => {
    let calls = 0;
    const emptyClient = new OllamaLlmClient({
        config,
        promptRepository: fakePromptRepository,
        fetchImpl: async () => {
            calls += 1;
            return new Response(JSON.stringify({ response: calls === 1 ? '   ' : 'Een geldig antwoord.' }), { status: 200 });
        },
    });
    const result = await emptyClient.generateDraft(draftContext);
    assert.equal(calls, 2);
    assert.equal(result.body, 'Een geldig antwoord.');

    const alwaysEmptyClient = new OllamaLlmClient({
        config,
        promptRepository: fakePromptRepository,
        fetchImpl: async () => new Response(JSON.stringify({ response: '' }), { status: 200 }),
    });
    await assert.rejects(alwaysEmptyClient.generateDraft(draftContext), /empty or too-short draft body/);
});

test('classifyEmail reports token usage and duration via onMetric', async () => {
    const metrics: Array<{ durationMs: number; callCount: number; promptTokens?: number; completionTokens?: number; totalTokens?: number }> = [];
    const client = new OllamaLlmClient({
        config, promptRepository: fakePromptRepository,
        onMetric: (metric) => metrics.push(metric),
        fetchImpl: async () => new Response(JSON.stringify({
            response: JSON.stringify({ spam: false, needsReply: true, language: 'nl', intent: 'trial_lesson', confidence: 0.9, reason: 'test' }),
            prompt_eval_count: 120, eval_count: 30,
        }), { status: 200 }),
    });
    await client.classifyEmail(input);
    assert.equal(metrics.length, 1);
    assert.equal(metrics[0].callCount, 1);
    assert.equal(metrics[0].promptTokens, 120);
    assert.equal(metrics[0].completionTokens, 30);
    assert.equal(metrics[0].totalTokens, 150);
    assert.ok(metrics[0].durationMs >= 0);
});

test('classifyEmail sums duration and tokens across the repair retry', async () => {
    const metrics: Array<{ callCount: number; promptTokens?: number; completionTokens?: number }> = [];
    let call = 0;
    const client = new OllamaLlmClient({
        config, promptRepository: fakePromptRepository,
        onMetric: (metric) => metrics.push(metric),
        fetchImpl: async () => {
            call += 1;
            if (call === 1) return new Response(JSON.stringify({ response: 'not json', prompt_eval_count: 50, eval_count: 10 }), { status: 200 });
            return new Response(JSON.stringify({
                response: JSON.stringify({ spam: false, needsReply: true, language: 'nl', intent: 'other', confidence: 0.5, reason: 'ok' }),
                prompt_eval_count: 60, eval_count: 15,
            }), { status: 200 });
        },
    });
    await client.classifyEmail(input);
    assert.equal(metrics.length, 1);
    assert.equal(metrics[0].callCount, 2);
    assert.equal(metrics[0].promptTokens, 110);
    assert.equal(metrics[0].completionTokens, 25);
});

test('classifyEmail reports duration-only metric when the response has no token fields', async () => {
    const metrics: Array<{ promptTokens?: number; completionTokens?: number; totalTokens?: number }> = [];
    const client = new OllamaLlmClient({
        config, promptRepository: fakePromptRepository,
        onMetric: (metric) => metrics.push(metric),
        fetchImpl: async () => new Response(JSON.stringify({
            response: JSON.stringify({ spam: false, needsReply: true, language: 'nl', intent: 'other', confidence: 0.5, reason: 'ok' }),
        }), { status: 200 }),
    });
    await client.classifyEmail(input);
    assert.equal(metrics[0].promptTokens, undefined);
    assert.equal(metrics[0].completionTokens, undefined);
    assert.equal(metrics[0].totalTokens, undefined);
});

test('generateDraft reports token usage via onMetric', async () => {
    const metrics: Array<{ callCount: number; totalTokens?: number }> = [];
    const client = new OllamaLlmClient({
        config, promptRepository: fakePromptRepository,
        onMetric: (metric) => metrics.push(metric),
        fetchImpl: async () => new Response(JSON.stringify({ response: 'Bedankt voor uw bericht.', prompt_eval_count: 200, eval_count: 40 }), { status: 200 }),
    });
    await client.generateDraft(draftContext);
    assert.equal(metrics.length, 1);
    assert.equal(metrics[0].callCount, 1);
    assert.equal(metrics[0].totalTokens, 240);
});

test('Ollama client exposes the configured num_ctx as its context length', () => {
    assert.equal(new OllamaLlmClient({ config }).contextLength, 1024);
});
