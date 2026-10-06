import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { configuredAiProvider } from '../ai/registry';
import { ApiError } from '../../common/http';
import { chunkKnowledge } from './chunk';

const vectorText = (embedding: number[]) => JSON.stringify(z.array(z.number().finite()).min(1).parse(embedding));

export const reindexDocument = async (id: string) => {
    const document = await prisma.knowledgeDocument.findUnique({ where: { id } });
    if (!document) throw new ApiError(404, 'KNOWLEDGE_NOT_FOUND', 'Knowledge document not found');
    const job = await prisma.job.create({ data: { type: 'KNOWLEDGE_EMBED', status: 'RUNNING', startedAt: new Date(), payload: { documentId: id } } });
    try {
        const { provider } = await configuredAiProvider(true);
        const content = chunkKnowledge(document.content);
        const embeddings = await provider.embed(content);
        if (embeddings.length !== content.length) throw new Error('Embedding count mismatch');
        await prisma.$transaction(async tx => {
            await tx.knowledgeChunk.deleteMany({ where: { documentId: id } });
            for (const [position, text] of content.entries()) {
                const chunk = await tx.knowledgeChunk.create({ data: { documentId: id, content: text, position, metadata: { model: provider.model } } });
                await tx.$executeRaw`UPDATE "KnowledgeChunk" SET embedding = ${vectorText(embeddings[position])}::vector WHERE id = ${chunk.id}::uuid`;
            }
            await tx.job.update({ where: { id: job.id }, data: { status: 'SUCCEEDED', finishedAt: new Date() } });
        });
        return { jobId: job.id, status: 'SUCCEEDED', chunks: content.length };
    } catch {
        await prisma.job.update({ where: { id: job.id }, data: { status: 'FAILED', error: 'Knowledge indexing failed; retry available', finishedAt: new Date() } });
        throw new ApiError(502, 'KNOWLEDGE_INDEXING_FAILED', 'Document is saved; indexing failed and can be retried');
    }
};

export interface RetrievedKnowledge { id: string; documentId: string; title: string; content: string; score: number }
const lexicalKnowledge = (query: string, eventId: string | null) => prisma.$queryRaw<RetrievedKnowledge[]>`
    SELECT c.id, c."documentId", d.title, c.content,
        ts_rank_cd(to_tsvector('simple', c.content), plainto_tsquery('simple', ${query}))::float AS score
    FROM "KnowledgeChunk" c JOIN "KnowledgeDocument" d ON d.id = c."documentId"
    WHERE d.status = 'ACTIVE' AND (d.scope = 'GLOBAL' OR (d.scope = 'EVENT' AND d."eventId" = ${eventId}::uuid))
        AND to_tsvector('simple', c.content) @@ plainto_tsquery('simple', ${query})
    ORDER BY score DESC LIMIT 8`;

const semanticKnowledge = async (query: string, eventId: string | null) => {
    const { provider } = await configuredAiProvider(true);
    const [embedding] = await provider.embed([query]);
    return prisma.$queryRaw<RetrievedKnowledge[]>`
        SELECT c.id, c."documentId", d.title, c.content, (1 - (c.embedding <=> ${vectorText(embedding)}::vector))::float AS score
        FROM "KnowledgeChunk" c JOIN "KnowledgeDocument" d ON d.id = c."documentId"
        WHERE d.status = 'ACTIVE' AND (d.scope = 'GLOBAL' OR (d.scope = 'EVENT' AND d."eventId" = ${eventId}::uuid))
            AND c.embedding IS NOT NULL AND c.metadata->>'model' = ${provider.model}
        ORDER BY c.embedding <=> ${vectorText(embedding)}::vector LIMIT 8`;
};

export const retrieveKnowledge = async (query: string, eventId: string | null) => {
    const lexical = await lexicalKnowledge(query, eventId);
    const semantic = await semanticKnowledge(query, eventId).catch(() => [] as RetrievedKnowledge[]);
    const candidates = new Map<string, RetrievedKnowledge>();
    for (const list of [lexical, semantic.filter(item => item.score >= 0.5)]) {
        list.forEach((item, index) => {
            const current = candidates.get(item.id);
            candidates.set(item.id, { ...item, score: (current?.score ?? 0) + 1 / (60 + index + 1) });
        });
    }
    return [...candidates.values()].sort((a, b) => b.score - a.score).slice(0, 6);
};

export const replaceTextChunks = async (tx: Prisma.TransactionClient, id: string, content: string) => {
    await tx.knowledgeChunk.deleteMany({ where: { documentId: id } });
    await tx.knowledgeChunk.createMany({ data: chunkKnowledge(content).map((text, position) => ({ documentId: id, content: text, position, metadata: {} })) });
};
