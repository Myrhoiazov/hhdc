import { createHash } from 'node:crypto';
import { KnowledgeVisibility, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { configuredAiProvider } from '../ai/registry';
import { ApiError } from '../../common/http';
import { documentChunks, KB_V2_MARKER, type ChunkSource } from './kb-v2/kb-chunks';
import type { KbV2Store, StoredChunkV2 } from './kb-v2/kb-store.types';
import type { KnowledgeChunkMetadataV2 } from './kb-v2/kb-v2.types';
import { DEFAULT_VISIBILITY } from './visibility';

const vectorText = (embedding: number[]) => JSON.stringify(z.array(z.number().finite()).min(1).parse(embedding));

export const reindexDocument = async (id: string) => {
    const document = await prisma.knowledgeDocument.findUnique({ where: { id } });
    if (!document) throw new ApiError(404, 'KNOWLEDGE_NOT_FOUND', 'Knowledge document not found');
    const job = await prisma.job.create({ data: { type: 'KNOWLEDGE_EMBED', status: 'RUNNING', startedAt: new Date(), payload: { documentId: id } } });
    try {
        const { provider } = await configuredAiProvider(true);
        const content = documentChunks(document);
        const embeddings = await provider.embed(content.map(chunk => chunk.content));
        if (embeddings.length !== content.length) throw new Error('Embedding count mismatch');
        await prisma.$transaction(async tx => {
            await tx.knowledgeChunk.deleteMany({ where: { documentId: id } });
            for (const [position, item] of content.entries()) {
                const metadata = { ...item.metadata, model: provider.model } as Prisma.InputJsonObject;
                const chunk = await tx.knowledgeChunk.create({ data: { documentId: id, content: item.content, position, metadata } });
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
const lexicalKnowledge = (query: string, eventId: string | null, visibility: string[]) => prisma.$queryRaw<RetrievedKnowledge[]>`
    SELECT c.id, c."documentId", d.title, c.content,
        ts_rank_cd(to_tsvector('simple', c.content), plainto_tsquery('simple', ${query}))::float AS score
    FROM "KnowledgeChunk" c JOIN "KnowledgeDocument" d ON d.id = c."documentId"
    WHERE d.status = 'ACTIVE' AND d.visibility::text = ANY(${visibility})
        AND (d.scope = 'GLOBAL' OR (d.scope = 'EVENT' AND d."eventId" = ${eventId}::uuid))
        AND to_tsvector('simple', c.content) @@ plainto_tsquery('simple', ${query})
    ORDER BY score DESC LIMIT 8`;

const semanticKnowledge = async (query: string, eventId: string | null, visibility: string[]) => {
    const { provider } = await configuredAiProvider(true);
    const [embedding] = await provider.embed([query]);
    return prisma.$queryRaw<RetrievedKnowledge[]>`
        SELECT c.id, c."documentId", d.title, c.content, (1 - (c.embedding <=> ${vectorText(embedding)}::vector))::float AS score
        FROM "KnowledgeChunk" c JOIN "KnowledgeDocument" d ON d.id = c."documentId"
        WHERE d.status = 'ACTIVE' AND d.visibility::text = ANY(${visibility})
        AND (d.scope = 'GLOBAL' OR (d.scope = 'EVENT' AND d."eventId" = ${eventId}::uuid))
            AND c.embedding IS NOT NULL AND c.metadata->>'model' = ${provider.model}
        ORDER BY c.embedding <=> ${vectorText(embedding)}::vector LIMIT 8`;
};

export const retrieveKnowledge = async (query: string, eventId: string | null, visibility: KnowledgeVisibility[] = DEFAULT_VISIBILITY) => {
    const lexical = await lexicalKnowledge(query, eventId, visibility);
    const semantic = await semanticKnowledge(query, eventId, visibility).catch(() => [] as RetrievedKnowledge[]);
    const candidates = new Map<string, RetrievedKnowledge>();
    for (const list of [lexical, semantic.filter(item => item.score >= 0.5)]) {
        list.forEach((item, index) => {
            const current = candidates.get(item.id);
            candidates.set(item.id, { ...item, score: (current?.score ?? 0) + 1 / (60 + index + 1) });
        });
    }
    return [...candidates.values()].sort((a, b) => b.score - a.score).slice(0, 6);
};

export const replaceTextChunks = async (tx: Prisma.TransactionClient, document: ChunkSource) => {
    await tx.knowledgeChunk.deleteMany({ where: { documentId: document.id } });
    await tx.knowledgeChunk.createMany({ data: documentChunks(document).map((chunk, position) => (
        { documentId: document.id, content: chunk.content, position, metadata: chunk.metadata as Prisma.InputJsonObject }
    )) });
};

interface StoredChunkRow { id: string; content: string; embedding: string; metadata: unknown }

const isChunkMetadata = (value: unknown): value is KnowledgeChunkMetadataV2 => typeof value === 'object' && value !== null
    && typeof (value as Record<string, unknown>).chunkId === 'string' && typeof (value as Record<string, unknown>).documentId === 'string';

const toStoredChunk = (row: StoredChunkRow): StoredChunkV2[] => (isChunkMetadata(row.metadata)
    ? [{ id: row.id, content: row.content, embedding: z.array(z.number()).parse(JSON.parse(row.embedding)), metadata: row.metadata }]
    : []);

// The layered (RAG v2) corpus: embedded chunks of active documents that carry v2 metadata and
// were embedded with the model the query will be embedded with.
export const listKbV2Chunks = async (embeddingModel: string, visibility: KnowledgeVisibility[] = DEFAULT_VISIBILITY): Promise<StoredChunkV2[]> => {
    const rows = await prisma.$queryRaw<StoredChunkRow[]>`
        SELECT c.id, c.content, c.embedding::text AS embedding, c.metadata
        FROM "KnowledgeChunk" c JOIN "KnowledgeDocument" d ON d.id = c."documentId"
        WHERE d.status = 'ACTIVE' AND d.visibility::text = ANY(${visibility}) AND c.embedding IS NOT NULL
            AND c.metadata->>'kb' = ${KB_V2_MARKER} AND c.metadata->>'model' = ${embeddingModel}`;
    return rows.flatMap(toStoredChunk);
};

export const createKbV2Store = (embeddingModel: string): KbV2Store => ({ listActiveChunks: () => listKbV2Chunks(embeddingModel) });

export const contentHash = (content: string) => createHash('sha256').update(content).digest('hex');

// Knowledge versioning (spec §59): every distinct content is kept as an immutable version.
// Returns false when the content is unchanged, so callers can skip re-chunking/re-embedding.
export const recordKnowledgeVersion = async (tx: Prisma.TransactionClient, documentId: string, content: string) => {
    const hash = contentHash(content);
    const latest = await tx.knowledgeDocumentVersion.findFirst({ where: { documentId }, orderBy: { version: 'desc' } });
    if (latest?.contentHash === hash) return false;
    await tx.knowledgeDocumentVersion.create({ data: { documentId, version: (latest?.version ?? 0) + 1, content, contentHash: hash } });
    return true;
};
