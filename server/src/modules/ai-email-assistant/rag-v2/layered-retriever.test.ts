import test from 'node:test';
import assert from 'node:assert/strict';
import type { EmailClassification } from '../email-assistant.service';
import { isNearDuplicate, matchFactTarget, retrieveLayeredKnowledge } from './layered-retriever';
import { understandQuery } from './query-understanding';
import { buildRetrievalPlan } from './retrieval-planner';
import { createFixtureStore, DEFAULT_TEST_LIMITS, fakeEmbeddings, FIXED_NOW } from './rag-v2.testHelpers';

const retrieve = async (body: string, language: EmailClassification['language'], intent: EmailClassification['intent']) => {
    const understanding = understandQuery({ subject: '', body, classification: { language, intent, needsReply: true } });
    const plan = buildRetrievalPlan(understanding, DEFAULT_TEST_LIMITS);
    const knowledge = await retrieveLayeredKnowledge(body, plan, { embeddings: fakeEmbeddings, store: createFixtureStore(), now: FIXED_NOW });
    return { understanding, plan, knowledge };
};

const ids = (chunks: Array<{ chunkId: string }>) => chunks.map((chunk) => chunk.chunkId);

test('"Где вы находитесь в Роттердаме?" retrieves the Rotterdam address first and never Amsterdam', async () => {
    const { knowledge } = await retrieve('Где вы находитесь в Роттердаме?', 'ru', 'location');
    assert.equal(knowledge.facts[0].chunkId, 'location_rotterdam#address');
    assert.ok(knowledge.facts.every((chunk) => chunk.metadata.city === undefined || chunk.metadata.city === 'rotterdam'));
    assert.ok(!ids(knowledge.facts).some((id) => id.includes('amsterdam')));
});

test('"Мне 13 лет, хочу танцевать в Роттердаме" retrieves the Rotterdam schedule, teenager FAQ and registration rules', async () => {
    const { knowledge } = await retrieve('Мне 13 лет, хочу танцевать в Роттердаме', 'ru', 'registration');
    const factIds = ids(knowledge.facts);
    assert.ok(factIds.some((id) => id === 'schedule_current#rotterdam' || id === 'location_rotterdam#schedule'), factIds.join(','));
    assert.ok(factIds.includes('location_rotterdam#address'));
    assert.ok(knowledge.facts.length <= DEFAULT_TEST_LIMITS.facts);
    assert.ok(knowledge.faq.every((chunk) => chunk.documentId === 'faq_teenagers'));
    assert.ok(knowledge.rules.some((chunk) => chunk.metadata.topic === 'registration' || chunk.metadata.topic === 'schedule'));
});

test('the duplicated Rotterdam schedule (location card + schedule page) reaches the context only once', async () => {
    const { knowledge } = await retrieve('Мне 13 лет, хочу танцевать в Роттердаме', 'ru', 'registration');
    const rotterdamSchedules = ids(knowledge.facts).filter((id) => id === 'schedule_current#rotterdam' || id === 'location_rotterdam#schedule');
    assert.equal(rotterdamSchedules.length, 1);
});

test('an availability question pulls the availability rule; without a city no per-city schedule is guessed', async () => {
    const { knowledge } = await retrieve('Есть ли место в группе?', 'ru', 'other');
    assert.ok(ids(knowledge.rules).includes('rule_schedule_rules#availability'), ids(knowledge.rules).join(','));
    assert.ok(knowledge.facts.every((chunk) => !chunk.metadata.city));
});

test('trial price question retrieves the known pricing rule, not an invented number', async () => {
    const { knowledge } = await retrieve('Сколько стоит пробное занятие?', 'ru', 'pricing');
    const factIds = ids(knowledge.facts);
    assert.ok(factIds.some((id) => id.startsWith('pricing_known_public_rules') || id.startsWith('class_trial_lesson')), factIds.join(','));
    assert.ok(!knowledge.facts.some((chunk) => /€\s?\d/.test(chunk.content)));
});

test('Dutch and English messages get same-language examples only; Russian stays Russian', async () => {
    const nl = await retrieve('Hallo, ik ben 14 en wil me inschrijven. Waar zitten jullie in Rotterdam?', 'nl', 'registration');
    assert.deepEqual(ids(nl.knowledge.examples), ['ex_registration_teenager_location_nl#main']);
    const en = await retrieve("Hi, I'm 14 and want to sign up. Where are you located in Rotterdam?", 'en', 'registration');
    assert.deepEqual(ids(en.knowledge.examples), ['ex_registration_teenager_location_en#main']);
    const ru = await retrieve('Хочу записаться, мне 14. Где вы находитесь в Роттердаме?', 'ru', 'registration');
    assert.ok(ru.knowledge.examples.every((chunk) => chunk.metadata.language === 'ru'));
});

test('camp questions only ever see camp facts', async () => {
    const { knowledge } = await retrieve('Сколько стоит LITO лагерь?', 'ru', 'pricing');
    assert.ok(knowledge.facts.length > 0);
    assert.ok(knowledge.facts.every((chunk) => chunk.metadata.category === 'camp'));
});

test('fact target matching: exact entity required, city-less chunks allowed, other city rejected', () => {
    const base = { id: 'x', category: 'location', priority: 'factual', language: 'canonical', dynamic: true, documentId: 'd', chunkId: 'd#a', section: 'a', sourcePath: 'p' } as const;
    assert.ok((matchFactTarget({ ...base, city: 'rotterdam' }, { category: 'location', city: 'rotterdam' }) ?? 0) > 1);
    assert.equal(matchFactTarget({ ...base, city: 'amsterdam' }, { category: 'location', city: 'rotterdam' }), null);
    assert.equal(matchFactTarget({ ...base, city: 'amsterdam' }, { category: 'location' }), null);
    assert.equal(matchFactTarget({ ...base, category: 'registration' }, { category: 'registration' }), 0.3);
});

test('near-duplicate detection compares fact lines, ignoring the heading line', () => {
    const lines = '- 16:00–17:00 — Kids group — 5–7\n- 17:00–18:00 — Street Jazz / Hip-Hop — 12+\n- 18:00–19:00 — High Heels — 18+';
    assert.equal(isNearDuplicate(`Rotterdam — Schedule\nMonday:\n${lines}`, `Current Public Schedule — Rotterdam\nMonday:\n${lines}`), true);
    assert.equal(isNearDuplicate(`A\n${lines}`, 'B\n- 18:00–19:00 — Kids group — 7–11'), false);
});

test('only the schedule-rule section matching the known entities reaches the context', async () => {
    const { knowledge } = await retrieve('Мне 13 лет, хочу танцевать в Роттердаме', 'ru', 'registration');
    const sections = knowledge.rules.map((chunk) => chunk.metadata.section);
    assert.ok(sections.includes('city_age_known'), sections.join(','));
    assert.ok(!sections.includes('age_known_city_unknown') && !sections.includes('city_known_age_unknown'));
});
