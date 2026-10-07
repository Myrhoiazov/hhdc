import type { AiProvider } from '../../integrations/ai/provider';

export type AiStage = 'CLASSIFICATION' | 'DRAFT';

// One line per pipeline stage: who answered, how long it took and what it cost in tokens.
export interface StageMetric {
    stage: AiStage;
    provider: string;
    model: string;
    calls: number;
    durationMs: number;
    promptTokens: number;
    completionTokens: number;
}

export interface MetricSink { metrics: StageMetric[] }

const stageMetric = (sink: MetricSink, stage: AiStage, provider: string, model: string): StageMetric => {
    const existing = sink.metrics.find(metric => metric.stage === stage);
    if (existing) return existing;
    const created: StageMetric = { stage, provider, model, calls: 0, durationMs: 0, promptTokens: 0, completionTokens: 0 };
    sink.metrics.push(created);
    return created;
};

// Wraps a provider so that every completion is attributed to its stage. A regenerated draft
// adds to the same DRAFT line, so the totals show what the whole email cost.
export const meterProvider = (provider: AiProvider, providerName: string, sink: MetricSink): AiProvider => {
    const timed = async <T>(stage: AiStage, work: () => Promise<T>): Promise<T> => {
        const metric = stageMetric(sink, stage, providerName, provider.model);
        provider.onUsage = usage => {
            metric.promptTokens += usage.promptTokens ?? 0;
            metric.completionTokens += usage.completionTokens ?? 0;
        };
        const started = Date.now();
        try { return await work(); }
        finally {
            metric.calls += 1;
            metric.durationMs += Date.now() - started;
        }
    };
    return {
        model: provider.model,
        generateStructured: (prompt, options) => timed('CLASSIFICATION', () => provider.generateStructured(prompt, options)),
        generateText: (prompt, systemPrompt) => timed('DRAFT', () => provider.generateText(prompt, systemPrompt)),
        embed: texts => provider.embed(texts),
    };
};

export const totalTokens = (metrics: StageMetric[]): number => metrics.reduce((sum, metric) => sum + metric.promptTokens + metric.completionTokens, 0);
