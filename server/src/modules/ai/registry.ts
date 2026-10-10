import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { createAiProvider } from '../../integrations/ai/provider';
import { GENERATION_ORDER } from '../providers/active-ai';
import { decryptCredentials } from '../providers/providers.service';
import { ApiError } from '../../common/http';

// Which connected AI provider to use and, optionally, a model other than the one saved on it.
// Without a selection the provider chosen in Settings answers.
export interface AiSelection { connectionId?: string; model?: string }

// Embeddings stay with the oldest connected provider: the knowledge base is indexed with its
// model, and vectors of another model would not match it.
const findConnection = (embedding: boolean, selection: AiSelection) => prisma.providerConnection.findFirst({
    where: { type: 'AI', status: 'CONNECTED', provider: { in: ['OPENAI', 'OLLAMA'] }, ...(selection.connectionId ? { id: selection.connectionId } : {}) },
    orderBy: embedding ? { createdAt: 'asc' } : GENERATION_ORDER,
});

export const configuredAiProvider = async (embedding = false, selection: AiSelection = {}) => {
    const connection = await findConnection(embedding, selection);
    if (!connection || (connection.provider !== 'OPENAI' && connection.provider !== 'OLLAMA')) throw new ApiError(503, 'AI_NOT_CONFIGURED', 'Connect an AI provider in Settings');
    const settings = z.object({ model: z.string().min(1), embeddingModel: z.string().optional() }).parse(connection.settings);
    const model = embedding ? settings.embeddingModel : selection.model?.trim() || settings.model;
    if (!model) throw new ApiError(503, 'EMBEDDING_NOT_CONFIGURED', 'Configure an embedding model');
    return { connection, provider: createAiProvider({ provider: connection.provider, model,
        credentials: connection.credentialsEncrypted ? decryptCredentials(connection.credentialsEncrypted) : {} }) };
};
