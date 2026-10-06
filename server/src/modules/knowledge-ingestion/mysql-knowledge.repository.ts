import { KnowledgeCategory, KnowledgeDocumentStatus } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { aiConfig } from '../../config/ai.config';
import type { EmbeddedKnowledgeChunk, EmbeddingClient, KnowledgeRepository, ScoredKnowledgeChunk } from './embedding.service';
import { chunkKnowledgeDocument, cosineSimilarity } from './embedding.service';
import type { KnowledgeSourceType, NormalizedKnowledgeDocument } from './knowledge-ingestion.service';

export interface PersistedKnowledgeDocument {
    document: NormalizedKnowledgeDocument;
    chunks: EmbeddedKnowledgeChunk[];
    embeddingModel?: string;
}

export interface StagedKnowledgeDocument {
    document: NormalizedKnowledgeDocument;
    category: KnowledgeCategory;
    priority: number;
    tags: string[];
}

export interface KnowledgeDocumentSummary {
    id: string;
    title: string | null;
    sourceType: string;
    sourceUrl: string;
    status: KnowledgeDocumentStatus;
    category: KnowledgeCategory;
    priority: number;
    tags: string[];
    chunkCount: number;
    errorMessage: string | null;
    lastSyncedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface KnowledgeDocumentMetadataUpdate {
    category?: KnowledgeCategory;
    priority?: number;
    tags?: string[];
}

export class MysqlKnowledgeRepository implements KnowledgeRepository {
    public async upsertChunks(chunks: EmbeddedKnowledgeChunk[]): Promise<void> {
        for (const chunk of chunks) {
            await prisma.knowledgeChunk.upsert({
                where: { id: chunk.id },
                create: { id: chunk.id, documentId: chunk.documentId, ordinal: chunk.ordinal, content: chunk.content, headingPath: chunk.headingPath ?? [], embedding: chunk.embedding, embeddingModel: aiConfig.ollamaEmbeddingModel, contentHash: chunk.contentHash },
                update: { content: chunk.content, headingPath: chunk.headingPath ?? [], embedding: chunk.embedding, embeddingModel: aiConfig.ollamaEmbeddingModel, contentHash: chunk.contentHash },
            });
        }
    }

    public async persistDocument(input: PersistedKnowledgeDocument): Promise<void> {
        const { document, chunks } = input;
        await prisma.$transaction(async (transaction) => {
            await transaction.knowledgeDocument.updateMany({
                where: { sourceType: document.sourceType, sourceId: document.sourceId, sourceUrl: document.sourceUrl, contentHash: { not: document.contentHash }, status: 'ACTIVE' },
                data: { status: 'INACTIVE' },
            });
            await transaction.knowledgeDocument.upsert({
                where: { id: `${document.sourceId}:${document.contentHash}` },
                create: { id: `${document.sourceId}:${document.contentHash}`, sourceType: document.sourceType, sourceId: document.sourceId, sourceUrl: document.sourceUrl, relativePath: document.relativePath, folderPath: document.folderPath, title: document.title, language: document.language, contentHash: document.contentHash, content: document.content, status: 'ACTIVE', lastSyncedAt: document.lastCheckedAt },
                update: { content: document.content, relativePath: document.relativePath, folderPath: document.folderPath, title: document.title, language: document.language, status: 'ACTIVE', lastSyncedAt: document.lastCheckedAt },
            });
            await transaction.knowledgeChunk.deleteMany({ where: { documentId: `${document.sourceId}:${document.contentHash}` } });
            if (chunks.length) await transaction.knowledgeChunk.createMany({ data: chunks.map((chunk) => ({ id: chunk.id, documentId: `${document.sourceId}:${document.contentHash}`, ordinal: chunk.ordinal, content: chunk.content, headingPath: chunk.headingPath ?? [], embedding: chunk.embedding, embeddingModel: input.embeddingModel ?? aiConfig.ollamaEmbeddingModel, contentHash: chunk.contentHash })) });
        });
    }

    public async search(query: number[], topK: number): Promise<ScoredKnowledgeChunk[]> {
        // v1 only ever searches its own namespace — ddc-knowledge-v2 chunks (kbVersion 'v2') are
        // served by LayeredKnowledgeRetriever and must never leak into the flat v1 corpus.
        const chunks = await prisma.knowledgeChunk.findMany({ where: { document: { status: 'ACTIVE', kbVersion: 'v1' } }, select: { id: true, documentId: true, ordinal: true, content: true, contentHash: true, embedding: true, document: { select: { sourceUrl: true } } } });
        return chunks.map((chunk) => ({ id: chunk.id, documentId: chunk.documentId, sourceUrl: chunk.document.sourceUrl, contentHash: chunk.contentHash, ordinal: chunk.ordinal, content: chunk.content, score: cosineSimilarity(query, Array.isArray(chunk.embedding) ? chunk.embedding.filter((value): value is number => typeof value === 'number') : []) })).sort((a, b) => b.score - a.score).slice(0, Math.max(0, topK));
    }

    // Manual admin ingestion (file upload / URL crawl): stores content + metadata as PENDING with
    // no chunks yet — embedding only runs when an admin explicitly triggers it via embedDocument.
    // If this exact content (same id = sourceId:contentHash) already exists and is ACTIVE, its
    // status is left alone (re-uploading identical content shouldn't undo its embeddings); only
    // the metadata is refreshed.
    public async stageDocument(input: StagedKnowledgeDocument): Promise<string> {
        const { document, category, priority, tags } = input;
        const id = `${document.sourceId}:${document.contentHash}`;
        await prisma.knowledgeDocument.upsert({
            where: { id },
            create: {
                id, sourceType: document.sourceType, sourceId: document.sourceId, sourceUrl: document.sourceUrl,
                relativePath: document.relativePath, folderPath: document.folderPath, title: document.title,
                language: document.language, contentHash: document.contentHash, content: document.content,
                status: KnowledgeDocumentStatus.PENDING, category, priority, tags, lastSyncedAt: document.lastCheckedAt,
            },
            update: { category, priority, tags },
        });
        return id;
    }

    private static toSummary(doc: {
        id: string; title: string | null; sourceType: string; sourceUrl: string; status: KnowledgeDocumentStatus;
        category: KnowledgeCategory; priority: number; tags: unknown; errorMessage: string | null;
        lastSyncedAt: Date | null; createdAt: Date; updatedAt: Date; _count: { chunks: number };
    }): KnowledgeDocumentSummary {
        return {
            id: doc.id, title: doc.title, sourceType: doc.sourceType, sourceUrl: doc.sourceUrl, status: doc.status,
            category: doc.category, priority: doc.priority,
            tags: Array.isArray(doc.tags) ? doc.tags.filter((tag): tag is string => typeof tag === 'string') : [],
            chunkCount: doc._count.chunks, errorMessage: doc.errorMessage, lastSyncedAt: doc.lastSyncedAt,
            createdAt: doc.createdAt, updatedAt: doc.updatedAt,
        };
    }

    public async listDocuments(filter: { category?: KnowledgeCategory; status?: KnowledgeDocumentStatus } = {}): Promise<KnowledgeDocumentSummary[]> {
        const documents = await prisma.knowledgeDocument.findMany({
            where: { ...(filter.category ? { category: filter.category } : {}), ...(filter.status ? { status: filter.status } : {}) },
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
            include: { _count: { select: { chunks: true } } },
        });
        return documents.map(MysqlKnowledgeRepository.toSummary);
    }

    // Paginated counterpart of listDocuments, used by the admin list endpoint. Kept separate
    // rather than adding an optional page/limit to listDocuments itself: embedPendingKnowledgeDocuments
    // (bulk "run embedding for all pending") needs every matching row, not one page of them.
    public async listDocumentsPage(
        filter: { category?: KnowledgeCategory; status?: KnowledgeDocumentStatus },
        pagination: { page: number; limit: number },
    ): Promise<{ items: KnowledgeDocumentSummary[]; total: number }> {
        const where = { ...(filter.category ? { category: filter.category } : {}), ...(filter.status ? { status: filter.status } : {}) };
        const [documents, total] = await Promise.all([
            prisma.knowledgeDocument.findMany({
                where,
                orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
                include: { _count: { select: { chunks: true } } },
                skip: (pagination.page - 1) * pagination.limit,
                take: pagination.limit,
            }),
            prisma.knowledgeDocument.count({ where }),
        ]);
        return { items: documents.map(MysqlKnowledgeRepository.toSummary), total };
    }

    public async countDocuments(filter: { category?: KnowledgeCategory; status?: KnowledgeDocumentStatus } = {}): Promise<number> {
        return prisma.knowledgeDocument.count({
            where: { ...(filter.category ? { category: filter.category } : {}), ...(filter.status ? { status: filter.status } : {}) },
        });
    }

    public async updateMetadata(id: string, data: KnowledgeDocumentMetadataUpdate): Promise<KnowledgeDocumentSummary> {
        const doc = await prisma.knowledgeDocument.update({ where: { id }, data, include: { _count: { select: { chunks: true } } } });
        return MysqlKnowledgeRepository.toSummary(doc);
    }

    public async deleteDocument(id: string): Promise<void> {
        await prisma.knowledgeDocument.delete({ where: { id } });
    }

    // Runs the same chunk+embed step persistDocument uses for automated sync, but only for a
    // single PENDING document, and flips it to ACTIVE on success — the manual counterpart to the
    // "run embedding" admin action.
    public async embedDocument(id: string, embeddings: EmbeddingClient): Promise<{ chunks: number }> {
        const record = await prisma.knowledgeDocument.findUnique({ where: { id } });
        if (!record) throw new Error(`Knowledge document not found: ${id}`);
        if (record.status !== KnowledgeDocumentStatus.PENDING) throw new Error(`Knowledge document is not pending: ${id}`);

        const document: NormalizedKnowledgeDocument = {
            sourceType: record.sourceType as KnowledgeSourceType, sourceId: record.sourceId, sourceUrl: record.sourceUrl,
            title: record.title ?? '', language: record.language ?? 'nl', content: record.content, contentHash: record.contentHash,
            lastCheckedAt: record.lastSyncedAt ?? record.createdAt, active: true,
            relativePath: record.relativePath ?? undefined, folderPath: record.folderPath ?? undefined,
        };
        const chunks = chunkKnowledgeDocument(document);
        const embedded: EmbeddedKnowledgeChunk[] = [];
        for (const chunk of chunks) embedded.push({ ...chunk, embedding: await embeddings.embed(chunk.content) });

        await prisma.$transaction(async (transaction) => {
            await transaction.knowledgeChunk.deleteMany({ where: { documentId: id } });
            if (embedded.length) {
                await transaction.knowledgeChunk.createMany({
                    data: embedded.map((chunk) => ({
                        id: chunk.id, documentId: id, ordinal: chunk.ordinal, content: chunk.content,
                        headingPath: chunk.headingPath ?? [], embedding: chunk.embedding,
                        embeddingModel: aiConfig.ollamaEmbeddingModel, contentHash: chunk.contentHash,
                    })),
                });
            }
            await transaction.knowledgeDocument.update({ where: { id }, data: { status: KnowledgeDocumentStatus.ACTIVE } });
        });
        return { chunks: embedded.length };
    }
}
