import assert from 'node:assert/strict';
import test from 'node:test';
import { AiDraftProvider } from '@prisma/client';
import { runEmailAssistantSimulation, buildSimulationRunInput } from './simulation.service';
import type { SimulationRunInput, SimulationRunRepository } from './simulation-metrics.repository';

const fakeRepository = (onCreate: (input: SimulationRunInput) => void): SimulationRunRepository => ({
    create: async (input) => { onCreate(input); return 42; },
    list: async () => { throw new Error('not implemented'); },
    getById: async () => { throw new Error('not implemented'); },
});

test('buildSimulationRunInput shapes the persisted record from the simulation input and outcome', () => {
    const record = buildSimulationRunInput(
        { subject: 'Вопрос', body: 'Сколько стоит?', noKnowledge: true, forceDraft: false, noQueryExpansion: false, noRerank: false },
        {
            deterministicSpamReason: null,
            classification: { spam: false, needsReply: true, language: 'ru', intent: 'pricing', confidence: 0.8, reason: 'x' },
            draftSkippedReason: null,
            classificationPromptName: 'v2 — strict', draftBodyPromptName: null,
            draftProvider: AiDraftProvider.OLLAMA, draftModel: 'qwen3:0.6b',
            classificationJson: { spam: false }, knowledgeJson: [], draftJson: { body: 'ok' },
            metrics: [], createdById: 7,
        },
    );
    assert.equal(record.subject, 'Вопрос');
    assert.equal(record.classificationSpam, false);
    assert.equal(record.classificationConfidence, 0.8);
    assert.equal(record.classificationPromptName, 'v2 — strict');
    assert.equal(record.createdById, 7);
});

test('runEmailAssistantSimulation persists a run and returns its metrics for a deterministic-spam email', async () => {
    let persisted: SimulationRunInput | null = null;
    const result = await runEmailAssistantSimulation(
        { subject: 'Viagra cheap!!!', body: 'buy now buy now buy now', noKnowledge: true },
        { runRepository: fakeRepository((input) => { persisted = input; }) },
    );
    assert.equal(result.draftSkippedReason, 'deterministic_spam');
    assert.ok(persisted);
    assert.equal(persisted!.deterministicSpamReason, result.deterministicSpamReason);
    assert.equal(result.runId, 42);
});

test('runEmailAssistantSimulation still returns a result when persistence throws', async () => {
    const throwingRepository: SimulationRunRepository = {
        create: async () => { throw new Error('DB is down'); },
        list: async () => { throw new Error('not implemented'); },
        getById: async () => { throw new Error('not implemented'); },
    };
    const result = await runEmailAssistantSimulation(
        { subject: 'Viagra cheap!!!', body: 'buy now buy now buy now', noKnowledge: true },
        { runRepository: throwingRepository },
    );
    assert.equal(result.draftSkippedReason, 'deterministic_spam');
    assert.equal(result.runId, null);
});
