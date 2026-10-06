import test from 'node:test';
import assert from 'node:assert/strict';
import { retrieveLayeredKnowledge } from './layered-retriever';
import { understandQuery } from './query-understanding';
import { checkRetrieval, checkUnderstanding, REGRESSION_CASES } from './rag-v2.regression';
import { buildRetrievalPlan } from './retrieval-planner';
import { createFixtureStore, DEFAULT_TEST_LIMITS, fakeEmbeddings, FIXED_NOW } from './rag-v2.testHelpers';

// Deterministic regression suite over __fixtures__/rag-v2-regression.json (RU/UK/NL/EN). Draft
// content checks (mustContain/mustNotContain) need a real model: `npm run knowledge:eval`.

test('regression dataset covers at least 25 cases in all four languages', () => {
    assert.ok(REGRESSION_CASES.length >= 25);
    assert.deepEqual(Array.from(new Set(REGRESSION_CASES.map((testCase) => testCase.expectedLanguage))).sort(), ['en', 'nl', 'ru', 'uk']);
    assert.equal(new Set(REGRESSION_CASES.map((testCase) => testCase.id)).size, REGRESSION_CASES.length);
});

for (const testCase of REGRESSION_CASES) {
    test(`regression: ${testCase.id}`, async () => {
        const understanding = understandQuery({ subject: '', body: testCase.message, classification: { ...testCase.llm, needsReply: true } });
        const plan = buildRetrievalPlan(understanding, DEFAULT_TEST_LIMITS);
        const knowledge = await retrieveLayeredKnowledge(testCase.message, plan, { embeddings: fakeEmbeddings, store: createFixtureStore(), now: FIXED_NOW });
        assert.deepEqual([...checkUnderstanding(testCase, understanding), ...checkRetrieval(testCase, knowledge)], []);
        assert.ok(knowledge.facts.length <= DEFAULT_TEST_LIMITS.facts && knowledge.rules.length <= DEFAULT_TEST_LIMITS.rules);
    });
}
