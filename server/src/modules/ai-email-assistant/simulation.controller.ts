import { Request, Response } from 'express';
import { z } from 'zod';
import { runEmailAssistantSimulation } from './simulation.service';
import { DraftProviderError, DRAFT_PROVIDERS } from './draft-provider';
import { createPrismaSimulationRunRepository } from './simulation-metrics.repository';

export const simulationRequestSchema = z.object({
    from: z.string().trim().max(320).optional(),
    subject: z.string().trim().min(1).max(500),
    body: z.string().trim().min(1).max(20_000),
    topK: z.coerce.number().int().min(1).max(20).optional(),
    noKnowledge: z.boolean().optional().default(false),
    forceDraft: z.boolean().optional().default(false),
    classificationPromptId: z.coerce.number().int().positive().optional(),
    draftBodyPromptId: z.coerce.number().int().positive().optional(),
    noQueryExpansion: z.boolean().optional().default(false),
    noRerank: z.boolean().optional().default(false),
});

export const simulateEmailAssistant = async (req: Request, res: Response) => {
    const parsed = simulationRequestSchema.safeParse(req.body);
    // Checked as `=== true` (not `!parsed.success`) — this tsconfig has no strictNullChecks, under
    // which TS does not narrow a `{success:true,data}|{success:false,error}` union on negation.
    // Destructured rather than passing `parsed.data` wholesale: once this file also imports
    // simulation.service's much larger type graph (draft/classification schemas etc.), TS widens
    // `parsed.data`'s inferred shape to all-optional at the call site — a per-field destructure
    // sidesteps whatever inference budget/depth issue causes that.
    if (parsed.success === true) {
        const { from, subject, body, topK, noKnowledge, forceDraft, classificationPromptId, draftBodyPromptId, noQueryExpansion, noRerank } = parsed.data;
        try {
            const result = await runEmailAssistantSimulation(
                { from, subject, body, topK, noKnowledge, forceDraft, classificationPromptId, draftBodyPromptId, noQueryExpansion, noRerank },
                { createdById: req.user?.id },
            );
            return res.json(result);
        } catch (error) {
            if (error instanceof DraftProviderError) {
                return res.status(503).json({ message: 'Выбранный AI-провайдер недоступен; обработайте письмо вручную', errorCode: error.code });
            }
            throw error;
        }
    }
    return res.status(400).json({ message: 'Проверьте тему/текст письма', details: parsed.error.flatten() });
};

const simulationRunRepository = createPrismaSimulationRunRepository();

export const listSimulationRunsSchema = z.object({
    promptId: z.coerce.number().int().positive().optional(),
    provider: z.enum([DRAFT_PROVIDERS.OLLAMA, DRAFT_PROVIDERS.OPENAI]).optional(),
    _page: z.coerce.number().int().min(1).optional(),
    _limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const listSimulationRuns = async (req: Request, res: Response) => {
    const parsed = listSimulationRunsSchema.safeParse(req.query);
    if (parsed.success !== true) return res.status(400).json({ message: 'Некорректные параметры', details: parsed.error.flatten() });
    const page = parsed.data._page ?? 1;
    const limit = parsed.data._limit ?? 20;
    const { items, total } = await simulationRunRepository.list({ promptId: parsed.data.promptId, provider: parsed.data.provider }, { page, limit });
    return res.json({ items, total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1) });
};

export const getSimulationRun = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Некорректный id' });
    const run = await simulationRunRepository.getById(id);
    if (!run) return res.status(404).json({ message: 'Запуск не найден' });
    return res.json(run);
};
