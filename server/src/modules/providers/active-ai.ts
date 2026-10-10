import { Prisma, ProviderConnection } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { safeProviderSelect } from './providers.service';

const AI_PROVIDERS = ['OPENAI', 'OLLAMA'];

// Answers and drafts come from the chosen connection. When none is chosen, or the chosen one is
// switched off, the oldest connected provider writes them, as it did before the choice existed.
export const GENERATION_ORDER: Prisma.ProviderConnectionOrderByWithRelationInput[] = [{ activeForGeneration: 'desc' }, { createdAt: 'asc' }];

export const assertCanGenerate = (connection: Pick<ProviderConnection, 'type' | 'provider' | 'status'> | null) => {
    if (!connection) throw new ApiError(404, 'NOT_FOUND', 'Provider connection not found');
    if (connection.type !== 'AI' || !AI_PROVIDERS.includes(connection.provider)) throw new ApiError(409, 'NOT_AN_AI_PROVIDER', 'Only an AI provider can write answers');
    if (connection.status !== 'CONNECTED') throw new ApiError(409, 'AI_PROVIDER_NOT_CONNECTED', 'Enable the provider before choosing it');
};

// Exactly one connection holds the choice: the previous one loses it in the same transaction.
export const activateAiConnection = (id: string) => prisma.$transaction(async tx => {
    const before = await tx.providerConnection.findUnique({ where: { id }, select: safeProviderSelect });
    assertCanGenerate(before);
    await tx.providerConnection.updateMany({ where: { activeForGeneration: true, id: { not: id } }, data: { activeForGeneration: false } });
    const provider = await tx.providerConnection.update({ where: { id }, data: { activeForGeneration: true }, select: safeProviderSelect });
    return { before, provider };
});
