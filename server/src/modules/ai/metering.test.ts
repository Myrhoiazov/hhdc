import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AiProvider } from '../../integrations/ai/provider';
import { meterProvider, totalTokens, type StageMetric } from './metering';
import { simulationStatus } from './simulation';
import type { EmailAssistantRun } from './email-assistant';

// Reports fixed token counts through onUsage, the way the real adapters do.
const fakeProvider = (): AiProvider => {
    const provider: AiProvider = {
        model: 'test-model',
        generateText: async () => { provider.onUsage?.({ promptTokens: 100, completionTokens: 20 }); return 'draft'; },
        generateStructured: async <T>() => { provider.onUsage?.({ promptTokens: 30, completionTokens: 10 }); return {} as T; },
        embed: async () => [[0]],
    };
    return provider;
};

test('every completion is attributed to its stage and a regenerated draft adds to the same line', async () => {
    const metrics: StageMetric[] = [];
    const metered = meterProvider(fakeProvider(), 'OLLAMA', { metrics });

    await metered.generateStructured('classify', { schema: {} });
    await metered.generateText('draft');
    await metered.generateText('draft again');

    assert.deepEqual(metrics.map(metric => [metric.stage, metric.provider, metric.model, metric.calls, metric.promptTokens, metric.completionTokens]), [
        ['CLASSIFICATION', 'OLLAMA', 'test-model', 1, 30, 10],
        ['DRAFT', 'OLLAMA', 'test-model', 2, 200, 40],
    ]);
    assert.equal(totalTokens(metrics), 280);
});

test('a failed completion is still counted, so the history shows the attempt', async () => {
    const metrics: StageMetric[] = [];
    const provider = fakeProvider();
    provider.generateText = async () => { throw new Error('model unavailable'); };
    await assert.rejects(meterProvider(provider, 'OLLAMA', { metrics }).generateText('draft'), /model unavailable/);
    assert.equal(metrics[0].calls, 1);
});

test('a simulation outcome is named after what the assistant decided', () => {
    const run = (spam: boolean, drafted: boolean) => ({ classification: { spam }, result: drafted ? {} : null }) as unknown as EmailAssistantRun;
    assert.equal(simulationStatus(run(false, true)), 'DRAFTED');
    assert.equal(simulationStatus(run(false, false)), 'NO_REPLY');
    assert.equal(simulationStatus(run(true, false)), 'SPAM');
});
