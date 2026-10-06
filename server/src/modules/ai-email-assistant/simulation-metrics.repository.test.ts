import assert from 'node:assert/strict';
import test from 'node:test';
import { AiSimulationStage, AiDraftProvider } from '@prisma/client';
import { buildSimulationRunMetricRow } from './simulation-metrics.repository';

test('buildSimulationRunMetricRow merges the client-reported metric with stage/provider/model', () => {
    const row = buildSimulationRunMetricRow(AiSimulationStage.CLASSIFICATION, AiDraftProvider.OLLAMA, 'qwen3:0.6b', {
        durationMs: 214, callCount: 1, promptTokens: 120, completionTokens: 30, totalTokens: 150,
    });
    assert.deepEqual(row, {
        stage: AiSimulationStage.CLASSIFICATION, provider: AiDraftProvider.OLLAMA, model: 'qwen3:0.6b',
        callCount: 1, durationMs: 214, promptTokens: 120, completionTokens: 30, totalTokens: 150, meta: undefined,
    });
});

test('buildSimulationRunMetricRow defaults callCount to 1 for metrics that omit it', () => {
    const row = buildSimulationRunMetricRow(AiSimulationStage.RETRIEVAL_EMBEDDING, AiDraftProvider.OLLAMA, 'bge-m3', { durationMs: 40 });
    assert.equal(row.callCount, 1);
    assert.equal(row.promptTokens, undefined);
});
