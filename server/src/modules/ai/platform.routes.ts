import { Request, Router } from 'express';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError, entityId, listRoute, normalizePagination, route } from '../../common/http';
import { currentUser, permitted } from '../auth/auth.middleware';
import { auditData } from '../audit/audit.service';
import { askAssistant } from './assistant.service';
import { confirmProposal, createProposal, proposalInputSchema, rejectProposal } from './proposals';

const LOW_CONFIDENCE = 0.6;

const ask = (req: Request) => {
    const { question } = z.object({ question: z.string().trim().min(3).max(2000) }).strict().parse(req.body);
    return askAssistant(question, currentUser(req));
};

const propose = (req: Request) => {
    const input = proposalInputSchema.parse(req.body);
    return createProposal(currentUser(req).id, input.type, input.payload);
};

// One human-in-the-loop workspace for everything AI produced that awaits a decision.
const reviewQueue = async (req: Request) => {
    const userId = currentUser(req).id;
    const [drafts, lowConfidence, proposals, duplicates] = await Promise.all([
        prisma.aiDraft.findMany({ where: { status: 'GENERATED' }, take: 25, orderBy: { createdAt: 'desc' }, select: { id: true, conversationId: true, intent: true, confidence: true, createdAt: true } }),
        prisma.aiDraft.count({ where: { status: 'GENERATED', confidence: { lt: LOW_CONFIDENCE } } }),
        prisma.aiActionProposal.findMany({ where: { userId, status: 'PENDING', expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' }, take: 25 }),
        prisma.duplicateCandidate.findMany({ where: { status: 'PENDING' }, orderBy: { score: 'desc' }, take: 25 }),
    ]);
    return { drafts, lowConfidenceDrafts: lowConfidence, proposals, duplicates };
};

const promptSchema = z.object({
    key: z.string().regex(/^[a-z][a-z0-9_]{1,60}$/), purpose: z.string().trim().min(1).max(500),
    systemPrompt: z.string().trim().min(1).max(20000), schema: z.record(z.unknown()).nullable().optional(),
}).strict();

// Prompts are append-only: saving always creates the next version of a key.
const createPromptVersion = async (req: Request) => {
    const input = promptSchema.parse(req.body);
    return prisma.$transaction(async tx => {
        const latest = await tx.promptDefinition.findFirst({ where: { key: input.key }, orderBy: { version: 'desc' } });
        const prompt = await tx.promptDefinition.create({ data: { key: input.key, purpose: input.purpose, systemPrompt: input.systemPrompt, schema: (input.schema ?? undefined) as never, version: (latest?.version ?? 0) + 1 } });
        await tx.auditLog.create({ data: auditData(req, 'PROMPT_VERSION_CREATED', 'PromptDefinition', prompt.id) });
        return prompt;
    });
};

const activatePrompt = async (req: Request) => {
    const prompt = await prisma.promptDefinition.findUnique({ where: { id: entityId(req) } });
    if (!prompt) throw new ApiError(404, 'PROMPT_NOT_FOUND', 'Prompt not found');
    return prisma.$transaction(async tx => {
        await tx.promptDefinition.updateMany({ where: { key: prompt.key, status: 'ACTIVE' }, data: { status: 'RETIRED' } });
        await tx.auditLog.create({ data: auditData(req, 'PROMPT_ACTIVATED', 'PromptDefinition', prompt.id) });
        return tx.promptDefinition.update({ where: { id: prompt.id }, data: { status: 'ACTIVE' } });
    });
};

const feedbackSchema = z.object({
    aiDraftId: z.string().uuid().optional(), aiInteractionId: z.string().uuid().optional(),
    rating: z.enum(['USEFUL', 'NOT_USEFUL']),
    reason: z.enum(['INCORRECT_INFORMATION', 'WRONG_TONE', 'MISSING_CONTEXT']).optional(), comment: z.string().max(2000).optional(),
}).strict();

const evaluationCaseSchema = z.object({
    type: z.enum(['CLASSIFICATION', 'DRAFT', 'RETRIEVAL']), input: z.record(z.unknown()), expected: z.record(z.unknown()),
    tags: z.array(z.string().max(50)).max(20).default([]), active: z.boolean().default(true),
}).strict();

const listEvaluationCases = async (req: Request) => {
    const { page, pageSize, skip } = normalizePagination(req.query);
    const [data, total] = await prisma.$transaction([
        prisma.aiEvaluationCase.findMany({ skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
        prisma.aiEvaluationCase.count(),
    ]);
    return { data, meta: { page, pageSize, total } };
};

export const aiPlatformRouter = Router();
aiPlatformRouter.post('/ai/assistant', permitted('ai.use'), route(ask));
aiPlatformRouter.get('/ai/review-queue', permitted('ai.use'), route(reviewQueue));
aiPlatformRouter.post('/ai/actions', permitted('ai.actions.propose'), route(propose));
aiPlatformRouter.post('/ai/actions/:id/confirm', permitted('ai.actions.confirm'), route(req => confirmProposal(entityId(req), currentUser(req).id)));
aiPlatformRouter.post('/ai/actions/:id/reject', permitted('ai.actions.confirm'), route(req => rejectProposal(entityId(req), currentUser(req).id)));
aiPlatformRouter.get('/ai/prompts', permitted('ai.manage'), route(() => prisma.promptDefinition.findMany({ orderBy: [{ key: 'asc' }, { version: 'desc' }], take: 200 })));
aiPlatformRouter.post('/ai/prompts', permitted('ai.manage'), route(createPromptVersion));
aiPlatformRouter.post('/ai/prompts/:id/activate', permitted('ai.manage'), route(activatePrompt));
aiPlatformRouter.post('/ai/feedback', permitted('ai.use'), route(req => prisma.aiFeedback.create({ data: { ...feedbackSchema.parse(req.body), rating: feedbackSchema.parse(req.body).rating, userId: currentUser(req).id } })));
aiPlatformRouter.get('/ai/evaluation-cases', permitted('ai.manage'), listRoute(listEvaluationCases));
aiPlatformRouter.post('/ai/evaluation-cases', permitted('ai.manage'), route(req => prisma.aiEvaluationCase.create({ data: evaluationCaseSchema.parse(req.body) as never })));
