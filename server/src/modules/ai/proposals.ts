import { AiActionProposal, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { assertFeatureEnabled } from '../platform/feature-flags';

export const PROPOSAL_TTL_MS = 15 * 60_000;

// Controlled AI actions (ADR 0015): the model may only PROPOSE one of these whitelisted,
// low-risk actions. Nothing changes until the same staff member confirms it.
export const PROPOSAL_SCHEMAS = {
    CREATE_TASK: z.object({
        title: z.string().trim().min(1).max(300), description: z.string().max(5000).optional(),
        dueDate: z.coerce.date().optional(), priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
        personId: z.string().uuid().optional(), eventId: z.string().uuid().optional(),
    }).strict(),
} as const;
export type ProposalType = keyof typeof PROPOSAL_SCHEMAS;
export const proposalInputSchema = z.object({ type: z.enum(['CREATE_TASK']), payload: z.record(z.unknown()) }).strict();

export const assertConfirmable = (proposal: Pick<AiActionProposal, 'userId' | 'status' | 'expiresAt'>, userId: string, now = new Date()) => {
    if (proposal.userId !== userId) throw new ApiError(403, 'PROPOSAL_NOT_OWNED', 'Only the user who received the proposal can decide on it');
    if (proposal.status !== 'PENDING') throw new ApiError(409, 'PROPOSAL_NOT_PENDING', 'Proposal was already decided');
    if (proposal.expiresAt.getTime() <= now.getTime()) throw new ApiError(409, 'PROPOSAL_EXPIRED', 'Proposal expired; ask the assistant again');
};

export const createProposal = async (userId: string, type: ProposalType, payload: unknown) => {
    const validated = PROPOSAL_SCHEMAS[type].parse(payload);
    return prisma.aiActionProposal.create({ data: { userId, type, payload: JSON.parse(JSON.stringify(validated)) as Prisma.InputJsonValue, expiresAt: new Date(Date.now() + PROPOSAL_TTL_MS) } });
};

type Executor = (tx: Prisma.TransactionClient, payload: unknown, userId: string) => Promise<{ entityType: string; entityId: string }>;
const EXECUTORS: Record<ProposalType, Executor> = {
    // The stored payload is re-validated at confirmation time, never trusted as-is.
    CREATE_TASK: async (tx, payload, userId) => {
        const input = PROPOSAL_SCHEMAS.CREATE_TASK.parse(payload);
        const task = await tx.task.create({ data: { title: input.title, description: input.description, dueDate: input.dueDate, priority: input.priority, personId: input.personId, eventId: input.eventId, assigneeId: userId, createdBy: userId } });
        return { entityType: 'Task', entityId: task.id };
    },
};

const requireProposal = async (id: string) => {
    const proposal = await prisma.aiActionProposal.findUnique({ where: { id } });
    if (!proposal) throw new ApiError(404, 'PROPOSAL_NOT_FOUND', 'Proposal not found');
    return proposal;
};

export const confirmProposal = async (id: string, userId: string) => {
    await assertFeatureEnabled('ai_actions');
    const proposal = await requireProposal(id);
    if (proposal.status === 'PENDING' && proposal.expiresAt.getTime() <= Date.now()) await prisma.aiActionProposal.update({ where: { id }, data: { status: 'EXPIRED' } });
    assertConfirmable(proposal, userId);
    return prisma.$transaction(async tx => {
        const claimed = await tx.aiActionProposal.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'CONFIRMED' } });
        if (!claimed.count) throw new ApiError(409, 'PROPOSAL_NOT_PENDING', 'Proposal was already decided');
        const result = await EXECUTORS[proposal.type as ProposalType](tx, proposal.payload, userId);
        await tx.auditLog.create({ data: { actorUserId: userId, action: 'AI_ACTION_CONFIRMED', entityType: result.entityType, entityId: result.entityId, after: { proposalId: id, type: proposal.type } } });
        return { proposal: await tx.aiActionProposal.update({ where: { id }, data: { status: 'EXECUTED', executedAt: new Date() } }), result };
    });
};

export const rejectProposal = async (id: string, userId: string) => {
    const proposal = await requireProposal(id);
    assertConfirmable(proposal, userId);
    return prisma.aiActionProposal.update({ where: { id }, data: { status: 'REJECTED' } });
};
