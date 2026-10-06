import assert from 'node:assert/strict';
import test from 'node:test';
import { simulationRequestSchema, listSimulationRunsSchema } from './simulation.controller';

test('simulationRequestSchema requires subject and body', () => {
    assert.equal(simulationRequestSchema.safeParse({}).success, false);
    assert.equal(simulationRequestSchema.safeParse({ subject: 'x' }).success, false);
    assert.equal(simulationRequestSchema.safeParse({ body: 'x' }).success, false);
});

test('simulationRequestSchema accepts a minimal valid payload and defaults flags to false', () => {
    const result = simulationRequestSchema.safeParse({ subject: 'Вопрос', body: 'Текст письма' });
    assert.equal(result.success, true);
    if (result.success) {
        assert.equal(result.data.noKnowledge, false);
        assert.equal(result.data.forceDraft, false);
        assert.equal(result.data.from, undefined);
    }
});

test('simulationRequestSchema coerces topK and rejects out-of-range values', () => {
    const inRange = simulationRequestSchema.safeParse({ subject: 'x', body: 'y', topK: '5' });
    assert.equal(inRange.success, true);
    if (inRange.success) assert.equal(inRange.data.topK, 5);
    assert.equal(simulationRequestSchema.safeParse({ subject: 'x', body: 'y', topK: '0' }).success, false);
    assert.equal(simulationRequestSchema.safeParse({ subject: 'x', body: 'y', topK: '21' }).success, false);
});

test('simulationRequestSchema rejects an empty subject or body', () => {
    assert.equal(simulationRequestSchema.safeParse({ subject: '', body: 'y' }).success, false);
    assert.equal(simulationRequestSchema.safeParse({ subject: 'x', body: '' }).success, false);
});

test('listSimulationRunsSchema defaults page/limit and accepts no filters', () => {
    const result = listSimulationRunsSchema.safeParse({});
    assert.equal(result.success, true);
});

test('listSimulationRunsSchema rejects a limit over 100', () => {
    assert.equal(listSimulationRunsSchema.safeParse({ _limit: '101' }).success, false);
});

test('listSimulationRunsSchema rejects an unknown provider', () => {
    assert.equal(listSimulationRunsSchema.safeParse({ provider: 'CLAUDE' }).success, false);
});

test('listSimulationRunsSchema coerces promptId and page/limit to numbers', () => {
    const result = listSimulationRunsSchema.safeParse({ promptId: '3', _page: '2', _limit: '10' });
    assert.equal(result.success, true);
    if (result.success) {
        assert.equal(result.data.promptId, 3);
        assert.equal(result.data._page, 2);
        assert.equal(result.data._limit, 10);
    }
});
