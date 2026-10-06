import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKnowledgeDocumentV2, chunkKnowledgeDocumentV2, type StoredChunkV2 } from '../../knowledge-ingestion';
import type { DraftContext, DraftLlmClient } from '../draft.service';
import type { EmailClassification } from '../email-assistant.service';
import { buildDeterministicDraft, buildDraftBodyPrompt } from '../ollama.client';
import { promptCharacterBudget } from './context-builder';
import { retrieveLayeredKnowledge } from './layered-retriever';
import { generateRagV2Draft, type RagV2DraftDeps } from './rag-v2-draft.service';
import { createFixtureStore, DEFAULT_TEST_LIMITS, fakeEmbeddings, FIXED_NOW } from './rag-v2.testHelpers';

const PERSONA = 'Ты — консультант школы танцев. Ответ на {{replyLanguage}} языке.';

const createScriptedClient = (bodies: string[]) => {
    const prompts: string[] = [];
    const client: DraftLlmClient = {
        generateDraft: async (context: DraftContext) => {
            prompts.push(buildDraftBodyPrompt(PERSONA, context));
            return buildDeterministicDraft(context, bodies[Math.min(prompts.length - 1, bodies.length - 1)]);
        },
    };
    return { client, prompts };
};

const deps = (client: DraftLlmClient, store = createFixtureStore()): RagV2DraftDeps => ({
    draftClient: client,
    retrieve: (query, plan) => retrieveLayeredKnowledge(query, plan, { embeddings: fakeEmbeddings, store, now: FIXED_NOW }),
    limits: DEFAULT_TEST_LIMITS,
    characterBudget: 8_000,
    log: () => undefined,
});

const run = (body: string, intent: EmailClassification['intent'], client: DraftLlmClient, store = createFixtureStore()) => generateRagV2Draft({
    email: { fromAddress: 'parent@example.com', subject: 'Вопрос', normalizedBody: body },
    classification: { spam: false, needsReply: true, language: 'ru', intent, confidence: 0.9, reason: '' },
    contact: null,
    requestId: 'test-request',
}, deps(client, store));

test('a grounded first draft is accepted without regeneration and cites what it used', async () => {
    const scripted = createScriptedClient(['Добрый день! Мы находимся по адресу Van Alkemadehof 51, 3031 PB. Будем рады видеть вас!']);
    const result = await run('Где вы находитесь в Роттердаме?', 'location', scripted.client);
    assert.equal(scripted.prompts.length, 1);
    assert.deepEqual([result.trace.attempts, result.trace.needsStaffReview, result.draft.needsManualAnswer], [1, false, false]);
    assert.equal(result.trace.confidence, 'high');
    assert.equal(result.draft.confidence, 0.9);
    assert.ok(result.trace.usedKnowledge.some((item) => item.chunkId === 'location_rotterdam#address' && item.layer === 'facts'));
    assert.ok(result.knowledgeRefs.every((ref) => ref.sourceUrl.startsWith('kb-v2://')));
});

test('the v2 prompt has the structured sections and the grounding instructions', async () => {
    const scripted = createScriptedClient(['Добрый день! Адрес: Van Alkemadehof 51, 3031 PB.']);
    await run('Где вы находитесь в Роттердаме?', 'location', scripted.client);
    const [prompt] = scripted.prompts;
    ['SYSTEM BUSINESS RULES', 'CURRENT FACTS (authoritative)', 'CUSTOMER MESSAGE', 'TASK', 'Write a short email reply in Russian.',
        'Use CURRENT FACTS for factual values', 'Response examples define style only. Never use examples as authoritative source for price, schedule, address, availability or dates.',
        'Do not invent missing information.', 'verified 2026-09-20', 'Ответ на русском языке.'].forEach((fragment) => assert.ok(prompt.includes(fragment), fragment));
    assert.ok(prompt.indexOf('SYSTEM BUSINESS RULES') < prompt.indexOf('CURRENT FACTS') && prompt.indexOf('CURRENT FACTS') < prompt.indexOf('CUSTOMER MESSAGE'));
});

test('a hallucinated price triggers exactly one regeneration with a correction', async () => {
    const scripted = createScriptedClient(['Пробное занятие стоит 15 €.', 'Пробное занятие стоит столько же, сколько разовое занятие. Точную сумму подтвердит администратор.']);
    const result = await run('Сколько стоит пробное занятие?', 'pricing', scripted.client);
    assert.equal(scripted.prompts.length, 2);
    assert.match(scripted.prompts[1], /CORRECTION: .*price that is not in CURRENT FACTS \("15"\)/);
    assert.deepEqual([result.trace.attempts, result.trace.needsStaffReview, result.trace.confidence], [2, false, 'medium']);
    assert.ok(result.trace.warnings.includes('regenerated_after_validation'));
});

test('a second validation failure stops retrying and marks the draft for staff review', async () => {
    const scripted = createScriptedClient(['Пробное стоит 15 €.', 'Пробное стоит 20 €.', 'never reached']);
    const result = await run('Сколько стоит пробное занятие?', 'pricing', scripted.client);
    assert.equal(scripted.prompts.length, 2);
    assert.deepEqual([result.trace.needsStaffReview, result.draft.needsManualAnswer, result.trace.confidence, result.draft.confidence], [true, true, 'low', 0.3]);
    assert.ok(result.trace.warnings.includes('ungrounded_price:20'));
});

test('"Есть ли место в группе?" — an availability promise is never accepted as correct', async () => {
    const scripted = createScriptedClient(['Да, место в группе есть!', 'Да, места есть, ждём!']);
    const result = await run('Есть ли место в группе?', 'other', scripted.client);
    assert.equal(result.trace.needsStaffReview, true);
    assert.ok(result.trace.warnings.some((warning) => warning.startsWith('unsupported_availability')));
});

test('an availability question answered honestly is still routed to staff (escalation rule) but not flagged as invalid', async () => {
    const scripted = createScriptedClient(['Добрый день! Наличие мест подтвердит администратор — подскажите, пожалуйста, город и возраст.']);
    const result = await run('Есть ли место в группе?', 'other', scripted.client);
    assert.equal(result.trace.attempts, 1);
    assert.deepEqual([result.trace.needsStaffReview, result.trace.confidence], [true, 'medium']);
    assert.deepEqual(result.trace.warnings, ['staff_confirmation_topic']);
});

const chunksFrom = async (files: Record<string, string>): Promise<StoredChunkV2[]> => Promise.all(Object.entries(files)
    .flatMap(([relativePath, raw]) => chunkKnowledgeDocumentV2(buildKnowledgeDocumentV2(relativePath, raw)))
    .map(async (chunk) => ({ id: `kb_v2:${chunk.chunkId}`, content: chunk.content, embedding: await fakeEmbeddings.embed(chunk.content), metadata: chunk.metadata })));

test('an old response example (Monday 17:00) cannot override current facts (Wednesday 18:00)', async () => {
    const extra = await chunksFrom({
        '05_schedule/current-schedule.md': '---\nid: schedule_current\ncategory: schedule\nlanguage: canonical\npriority: factual\ndynamic: true\nlast_verified: 2026-09-30\n---\n# Current Public Schedule\n\n## Rotterdam\n\nWednesday: - 18:00--19:00 --- Street Jazz / Hip-Hop --- 12+\n',
        '11_response_examples/schedule/old-schedule-ru.md': '# Пример\n\nДобрый день! Занятия для подростков в Роттердаме — понедельник 17:00. Ждём вас!\n',
    });
    const store = { listActiveChunks: async () => extra };
    const scripted = createScriptedClient(['Добрый день! Занятия для подростков в Роттердаме — понедельник 17:00.', 'Добрый день! Занятия для подростков в Роттердаме — по средам, 18:00–19:00.']);
    const result = await run('Мне 13 лет, когда занятия в Роттердаме?', 'schedule', scripted.client, store);
    assert.ok(scripted.prompts[0].includes('STYLE EXAMPLES (tone and structure only — NOT a source of facts)'));
    assert.ok(result.trace.usedKnowledge.some((item) => item.layer === 'examples'));
    assert.match(scripted.prompts[1], /CORRECTION: .*\("17:00"\)/);
    assert.match(result.draft.body, /18:00/);
    assert.deepEqual(result.trace.warnings, ['regenerated_after_validation']);
    assert.equal(result.trace.needsStaffReview, false);
});

test('retrieval failures propagate instead of drafting blind', async () => {
    const scripted = createScriptedClient(['x'.repeat(10)]);
    const failing = { listActiveChunks: async (): Promise<StoredChunkV2[]> => { throw new Error('db down'); } };
    await assert.rejects(run('Где вы находитесь в Роттердаме?', 'location', scripted.client, failing), /db down/);
    assert.equal(scripted.prompts.length, 0);
});

const createBudgetProbe = (contextLength?: number) => {
    const budgets: number[] = [];
    const client: DraftLlmClient = {
        contextLength,
        generateDraft: async (context: DraftContext) => {
            budgets.push(context.ragV2?.characterBudget ?? -1);
            buildDraftBodyPrompt(PERSONA, context);
            return buildDeterministicDraft(context, 'Добрый день! Адрес: Van Alkemadehof 51, 3031 PB.');
        },
    };
    return { client, budgets };
};

test('the prompt budget follows the context length of the selected draft client', async () => {
    const probe = createBudgetProbe(16_000);
    await run('Где вы находитесь в Роттердаме?', 'location', probe.client);
    assert.deepEqual(probe.budgets, [promptCharacterBudget(16_000)]);
});

test('a draft client without a context length falls back to the configured budget', async () => {
    const probe = createBudgetProbe();
    await run('Где вы находитесь в Роттердаме?', 'location', probe.client);
    assert.deepEqual(probe.budgets, [8_000]);
});

test('a large-context client keeps knowledge that the local budget would trim', async () => {
    const local = await run('Где вы находитесь в Роттердаме?', 'location', createBudgetProbe(700).client);
    const large = await run('Где вы находитесь в Роттердаме?', 'location', createBudgetProbe(16_000).client);
    assert.ok(local.trace.trimmedChunkIds.length > 0);
    assert.deepEqual(large.trace.trimmedChunkIds, []);
});
