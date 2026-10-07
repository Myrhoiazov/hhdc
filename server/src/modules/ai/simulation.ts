import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError, normalizePagination } from '../../common/http';
import { normalizeEmail } from './email-classification';
import { runEmailAssistant, type EmailAssistantRun } from './email-assistant';
import { totalTokens } from './metering';
import { allChunks } from './rag-v2/rag-v2-draft.service';

export const simulationSchema = z.object({
    fromAddress: z.string().trim().email().max(320).default('customer@example.test'),
    subject: z.string().trim().max(500).default(''),
    body: z.string().trim().min(1).max(12000),
    classificationPromptId: z.string().uuid().optional(),
    draftPromptId: z.string().uuid().optional(),
    // The connected AI provider to run on, and a model other than the one saved on it.
    providerConnectionId: z.string().uuid().optional(),
    model: z.string().trim().min(1).max(200).optional(),
}).strict();
export type SimulationInput = z.infer<typeof simulationSchema>;

export type SimulationStatus = 'DRAFTED' | 'NO_REPLY' | 'SPAM' | 'FAILED';

// What the admin panel shows: the decision at each stage and exactly what the model was given.
export const toSimulationView = (run: EmailAssistantRun) => ({
    classification: run.classification,
    provider: run.provider,
    model: run.model,
    promptVersion: run.promptVersion,
    draft: run.result ? { subject: run.result.draft.subject, body: run.result.draft.body, confidence: run.result.draft.confidence, needsStaffReview: run.result.trace.needsStaffReview } : null,
    trace: run.result?.trace ?? null,
    knowledge: run.result ? allChunks(run.result.knowledge).map(({ chunk, layer }) => ({
        layer, chunkId: chunk.chunkId, documentId: chunk.documentId, sourcePath: chunk.metadata.sourcePath, score: chunk.score, content: chunk.content,
    })) : [],
    metrics: run.metrics,
});

export const simulationStatus = (run: EmailAssistantRun): SimulationStatus => {
    if (run.result) return 'DRAFTED';
    return run.classification.spam ? 'SPAM' : 'NO_REPLY';
};

const toJson = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));

interface RunRecord { input: SimulationInput; userId: string; durationMs: number }

const saveRun = (record: RunRecord, run: EmailAssistantRun) => prisma.aiSimulationRun.create({ data: {
    userId: record.userId, fromAddress: record.input.fromAddress, subject: record.input.subject, body: record.input.body,
    status: simulationStatus(run), provider: run.provider, model: run.model, promptVersion: run.promptVersion,
    result: toJson(toSimulationView(run)), metrics: toJson(run.metrics), totalTokens: totalTokens(run.metrics), durationMs: record.durationMs,
} });

// A failed run is history too: it shows that the email would have stayed with a person.
const saveFailure = (record: RunRecord, error: unknown) => prisma.aiSimulationRun.create({ data: {
    userId: record.userId, fromAddress: record.input.fromAddress, subject: record.input.subject, body: record.input.body,
    status: 'FAILED', model: record.input.model, durationMs: record.durationMs,
    error: (error instanceof Error ? error.message : 'Simulation failed').slice(0, 500),
} });

// Runs the real pipeline on a pasted email without sending anything, optionally with prompt
// versions that are not active yet and on a chosen provider and model. Every run is kept.
export const simulateEmail = async (input: SimulationInput, userId: string) => {
    const started = Date.now();
    const email = normalizeEmail({ fromAddress: input.fromAddress, subject: input.subject, text: input.body });
    try {
        const run = await runEmailAssistant(email, null, {
            mode: 'strict', promptIds: { classification: input.classificationPromptId, draftBody: input.draftPromptId },
            ai: { connectionId: input.providerConnectionId, model: input.model },
        });
        const saved = await saveRun({ input, userId, durationMs: Date.now() - started }, run);
        return { id: saved.id, createdAt: saved.createdAt, status: saved.status, durationMs: saved.durationMs, totalTokens: saved.totalTokens, ...toSimulationView(run) };
    } catch (error) {
        await saveFailure({ input, userId, durationMs: Date.now() - started }, error);
        throw error;
    }
};

const LIST_FIELDS = { id: true, createdAt: true, subject: true, body: true, status: true, provider: true, model: true, promptVersion: true, totalTokens: true, durationMs: true, error: true } as const;
const PREVIEW_CHARS = 120;

export const listSimulationRuns = async (query: unknown) => {
    const { page, pageSize, skip } = normalizePagination(query);
    const [rows, total] = await prisma.$transaction([
        prisma.aiSimulationRun.findMany({ orderBy: { createdAt: 'desc' }, skip, take: pageSize, select: LIST_FIELDS }),
        prisma.aiSimulationRun.count(),
    ]);
    return { data: rows.map(({ body, ...row }) => ({ ...row, preview: body.slice(0, PREVIEW_CHARS) })), meta: { page, pageSize, total } };
};

export const getSimulationRun = async (id: string) => {
    const run = await prisma.aiSimulationRun.findUnique({ where: { id } });
    if (!run) throw new ApiError(404, 'SIMULATION_NOT_FOUND', 'Simulation run not found');
    return run;
};
