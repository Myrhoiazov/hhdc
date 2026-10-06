import { AiDraftProvider, AiSimulationStage, Prisma } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';

export interface SimulationRunMetricInput {
    stage: AiSimulationStage;
    provider: AiDraftProvider;
    model: string;
    callCount: number;
    durationMs: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    meta?: Record<string, unknown>;
}

// Merges whatever partial metric a client's onMetric callback reported (durationMs is the only
// field every client guarantees — see the client-specific metric shapes in ollama.client.ts,
// openai.client.ts, query-expansion.service.ts, reranker.service.ts, retrieval.service.ts) with
// the stage/provider/model the caller (simulation.service.ts) already knows statically.
export const buildSimulationRunMetricRow = (
    stage: AiSimulationStage,
    provider: AiDraftProvider,
    model: string,
    metric: { durationMs: number; callCount?: number; promptTokens?: number; completionTokens?: number; totalTokens?: number; meta?: Record<string, unknown> },
): SimulationRunMetricInput => ({
    stage, provider, model,
    callCount: metric.callCount ?? 1,
    durationMs: metric.durationMs,
    promptTokens: metric.promptTokens,
    completionTokens: metric.completionTokens,
    totalTokens: metric.totalTokens,
    meta: metric.meta,
});

export interface SimulationRunInput {
    fromAddress?: string;
    subject: string;
    body: string;
    topK?: number;
    noKnowledge: boolean;
    forceDraft: boolean;
    noQueryExpansion: boolean;
    noRerank: boolean;
    classificationPromptId?: number;
    classificationPromptName?: string;
    draftBodyPromptId?: number;
    draftBodyPromptName?: string;
    draftProvider?: AiDraftProvider;
    draftModel?: string;
    classificationSpam?: boolean;
    classificationNeedsReply?: boolean;
    classificationConfidence?: number;
    classificationJson?: unknown;
    knowledgeJson?: unknown;
    draftJson?: unknown;
    deterministicSpamReason?: string;
    draftSkippedReason?: string;
    createdById?: number;
    metrics: SimulationRunMetricInput[];
}

export interface SimulationRunSummary {
    id: number;
    fromAddress: string | null;
    subject: string;
    classificationPromptName: string | null;
    draftBodyPromptName: string | null;
    draftProvider: AiDraftProvider | null;
    draftModel: string | null;
    classificationSpam: boolean | null;
    classificationConfidence: number | null;
    deterministicSpamReason: string | null;
    draftSkippedReason: string | null;
    createdAt: Date;
    metrics: SimulationRunMetricInput[];
}

export interface SimulationRunDetail extends SimulationRunSummary {
    body: string;
    classification: unknown;
    knowledge: unknown;
    draft: unknown;
}

export interface SimulationRunListFilter { promptId?: number; provider?: AiDraftProvider; }
export interface SimulationRunPage { page: number; limit: number; }

export interface SimulationRunRepository {
    create(input: SimulationRunInput): Promise<number>;
    list(filter: SimulationRunListFilter, page: SimulationRunPage): Promise<{ items: SimulationRunSummary[]; total: number }>;
    getById(id: number): Promise<SimulationRunDetail | null>;
}

const toSummary = (row: {
    id: number; fromAddress: string | null; subject: string;
    classificationPromptName: string | null; draftBodyPromptName: string | null;
    draftProvider: AiDraftProvider | null; draftModel: string | null;
    classificationSpam: boolean | null; classificationConfidence: number | null;
    deterministicSpamReason: string | null; draftSkippedReason: string | null; createdAt: Date;
    metrics: Array<{ stage: AiSimulationStage; provider: AiDraftProvider; model: string; callCount: number; durationMs: number; promptTokens: number | null; completionTokens: number | null; totalTokens: number | null; meta: unknown }>;
}): SimulationRunSummary => ({
    id: row.id, fromAddress: row.fromAddress, subject: row.subject,
    classificationPromptName: row.classificationPromptName, draftBodyPromptName: row.draftBodyPromptName,
    draftProvider: row.draftProvider, draftModel: row.draftModel,
    classificationSpam: row.classificationSpam, classificationConfidence: row.classificationConfidence,
    deterministicSpamReason: row.deterministicSpamReason, draftSkippedReason: row.draftSkippedReason,
    createdAt: row.createdAt,
    metrics: row.metrics.map((metric) => ({
        stage: metric.stage, provider: metric.provider, model: metric.model, callCount: metric.callCount, durationMs: metric.durationMs,
        promptTokens: metric.promptTokens ?? undefined, completionTokens: metric.completionTokens ?? undefined, totalTokens: metric.totalTokens ?? undefined,
        meta: (metric.meta as Record<string, unknown> | null) ?? undefined,
    })),
});

const createSimulationRun = async (input: SimulationRunInput): Promise<number> => {
    const created = await prisma.$transaction(async (transaction) => {
        const run = await transaction.aiSimulationRun.create({
            data: {
                fromAddress: input.fromAddress, subject: input.subject, body: input.body, topK: input.topK,
                noKnowledge: input.noKnowledge, forceDraft: input.forceDraft,
                noQueryExpansion: input.noQueryExpansion, noRerank: input.noRerank,
                classificationPromptId: input.classificationPromptId, classificationPromptName: input.classificationPromptName,
                draftBodyPromptId: input.draftBodyPromptId, draftBodyPromptName: input.draftBodyPromptName,
                draftProvider: input.draftProvider, draftModel: input.draftModel,
                classificationSpam: input.classificationSpam, classificationNeedsReply: input.classificationNeedsReply,
                classificationConfidence: input.classificationConfidence,
                classificationJson: input.classificationJson as Prisma.InputJsonValue | undefined,
                knowledgeJson: input.knowledgeJson as Prisma.InputJsonValue | undefined,
                draftJson: input.draftJson as Prisma.InputJsonValue | undefined,
                deterministicSpamReason: input.deterministicSpamReason, draftSkippedReason: input.draftSkippedReason,
                createdById: input.createdById,
            },
        });
        if (input.metrics.length) {
            await transaction.aiSimulationRunMetric.createMany({
                data: input.metrics.map((metric) => ({
                    runId: run.id, stage: metric.stage, provider: metric.provider, model: metric.model,
                    callCount: metric.callCount, durationMs: metric.durationMs,
                    promptTokens: metric.promptTokens, completionTokens: metric.completionTokens, totalTokens: metric.totalTokens,
                    meta: metric.meta as Prisma.InputJsonValue | undefined,
                })),
            });
        }
        return run;
    });
    return created.id;
};

const listSimulationRuns = async (
    filter: SimulationRunListFilter,
    page: SimulationRunPage,
): Promise<{ items: SimulationRunSummary[]; total: number }> => {
    const where = {
        ...(filter.provider ? { draftProvider: filter.provider } : {}),
        ...(filter.promptId ? { OR: [{ classificationPromptId: filter.promptId }, { draftBodyPromptId: filter.promptId }] } : {}),
    };
    const [rows, total] = await Promise.all([
        prisma.aiSimulationRun.findMany({
            where, orderBy: { createdAt: 'desc' }, skip: (page.page - 1) * page.limit, take: page.limit,
            include: { metrics: true },
        }),
        prisma.aiSimulationRun.count({ where }),
    ]);
    return { items: rows.map(toSummary), total };
};

const getSimulationRunById = async (id: number): Promise<SimulationRunDetail | null> => {
    const row = await prisma.aiSimulationRun.findUnique({ where: { id }, include: { metrics: true } });
    if (!row) return null;
    return { ...toSummary(row), body: row.body, classification: row.classificationJson, knowledge: row.knowledgeJson ?? [], draft: row.draftJson };
};

export const createPrismaSimulationRunRepository = (): SimulationRunRepository => ({
    create: createSimulationRun,
    list: listSimulationRuns,
    getById: getSimulationRunById,
});
