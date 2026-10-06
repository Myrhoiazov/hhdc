import { createHash } from 'node:crypto';
import { KnowledgeCategory, Prisma } from '@prisma/client';
import prisma from '../../../../prisma/prisma-client';
import type { KnowledgeChunkMetadataV2, KnowledgeChunkV2, KnowledgeDocumentV2, KnowledgePriority } from './kb-v2.types';

// RAG v2 rows live in the same knowledge_documents/knowledge_chunks tables as v1, namespaced by
// kb_version='v2' + source_type='kb_v2'. v1 search filters kb_version='v1', so the two corpora
// never mix and a v2 reindex can never touch v1 rows.
export const KB_V2_VERSION = 'v2';
export const KB_V2_SOURCE_TYPE = 'kb_v2';

export interface IndexedDocumentV2 {
    sourceId: string;
    contentHash: string;
    embeddingModel: string | null;
}

export interface EmbeddedChunkV2 extends KnowledgeChunkV2 { embedding: number[] }

export interface StoredChunkV2 {
    id: string;
    content: string;
    embedding: number[];
    metadata: KnowledgeChunkMetadataV2;
}

export interface KbV2Store {
    listIndexedDocuments(): Promise<IndexedDocumentV2[]>;
    replaceDocument(input: { document: KnowledgeDocumentV2; chunks: EmbeddedChunkV2[]; embeddingModel: string }): Promise<void>;
    removeDocuments(sourceIds: string[]): Promise<number>;
    listActiveChunks(): Promise<StoredChunkV2[]>;
}

const CATEGORY_MAP: Record<string, KnowledgeCategory> = {
    brand: KnowledgeCategory.BRAND, location: KnowledgeCategory.LOCATIONS, style: KnowledgeCategory.DANCE_STYLES,
    class: KnowledgeCategory.CLASSES, schedule: KnowledgeCategory.SCHEDULE, registration: KnowledgeCategory.REGISTRATION,
    faq: KnowledgeCategory.FAQ, camp: KnowledgeCategory.CAMP, rule: KnowledgeCategory.BUSINESS_RULES,
    source: KnowledgeCategory.SOURCES,
};

// Mirrors the retrieval priority (rules → facts → FAQ → examples) in the admin list ordering.
const PRIORITY_RANK: Record<KnowledgePriority, number> = { rules: 3, factual: 2, faq: 1, example: 0 };

export const toStoredDocumentId = (document: KnowledgeDocumentV2) => `${KB_V2_SOURCE_TYPE}:${document.metadata.id}:${document.contentHash.slice(0, 16)}`;
export const toStoredChunkId = (chunkId: string) => `${KB_V2_SOURCE_TYPE}:${chunkId}`.slice(0, 191);

const toDocumentRow = (document: KnowledgeDocumentV2): Prisma.KnowledgeDocumentUncheckedCreateInput => ({
    id: toStoredDocumentId(document),
    sourceType: KB_V2_SOURCE_TYPE,
    sourceId: document.metadata.id,
    sourceUrl: (document.sourceUrl ?? `kb-v2://${document.sourcePath}`).slice(0, 500),
    relativePath: document.sourcePath,
    folderPath: document.sourcePath.includes('/') ? document.sourcePath.slice(0, document.sourcePath.lastIndexOf('/')) : null,
    title: document.title.slice(0, 500),
    language: document.metadata.language,
    contentHash: document.contentHash,
    content: document.content,
    status: 'ACTIVE',
    category: CATEGORY_MAP[document.metadata.category] ?? KnowledgeCategory.OTHER,
    priority: PRIORITY_RANK[document.metadata.priority] ?? 0,
    tags: [document.metadata.priority, document.metadata.topic, document.metadata.city, document.metadata.style].filter(Boolean) as string[],
    kbVersion: KB_V2_VERSION,
    lastSyncedAt: new Date(),
});

// Plain-data round trip: yields the JSON value Prisma stores, without undefined fields.
const toInputJson = (metadata: KnowledgeChunkMetadataV2): Prisma.InputJsonValue => JSON.parse(JSON.stringify(metadata));

// The metadata column is free-form JSON. A row whose metadata is not a chunk-metadata object
// (written by hand or by another version) is skipped instead of being trusted blindly.
const isChunkMetadata = (value: unknown): value is KnowledgeChunkMetadataV2 => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
    && typeof (value as Record<string, unknown>).chunkId === 'string'
    && typeof (value as Record<string, unknown>).documentId === 'string'
);

const toChunkRows = (documentId: string, chunks: EmbeddedChunkV2[], embeddingModel: string): Prisma.KnowledgeChunkCreateManyInput[] => chunks.map((chunk) => ({
    id: toStoredChunkId(chunk.chunkId),
    documentId,
    ordinal: chunk.ordinal,
    content: chunk.content,
    headingPath: chunk.headingPath,
    embedding: chunk.embedding,
    embeddingModel,
    contentHash: createHash('sha256').update(chunk.content).digest('hex'),
    metadata: toInputJson(chunk.metadata),
}));

const listIndexedDocuments = async (): Promise<IndexedDocumentV2[]> => {
    const rows = await prisma.knowledgeDocument.findMany({
        where: { kbVersion: KB_V2_VERSION, sourceType: KB_V2_SOURCE_TYPE },
        select: { sourceId: true, contentHash: true, chunks: { select: { embeddingModel: true }, take: 1 } },
    });
    return rows.map((row) => ({ sourceId: row.sourceId, contentHash: row.contentHash, embeddingModel: row.chunks[0]?.embeddingModel ?? null }));
};

// Superseded versions of the same document are deleted (not marked INACTIVE like v1): the KB
// files themselves are the history, and stale rows would only collide on chunk ids.
const replaceDocument: KbV2Store['replaceDocument'] = async ({ document, chunks, embeddingModel }) => {
    const row = toDocumentRow(document);
    await prisma.$transaction(async (transaction) => {
        await transaction.knowledgeDocument.deleteMany({ where: { kbVersion: KB_V2_VERSION, sourceType: KB_V2_SOURCE_TYPE, sourceId: document.metadata.id } });
        await transaction.knowledgeDocument.create({ data: row });
        if (chunks.length) await transaction.knowledgeChunk.createMany({ data: toChunkRows(row.id as string, chunks, embeddingModel) });
    });
};

const removeDocuments = async (sourceIds: string[]): Promise<number> => {
    if (!sourceIds.length) return 0;
    const result = await prisma.knowledgeDocument.deleteMany({ where: { kbVersion: KB_V2_VERSION, sourceType: KB_V2_SOURCE_TYPE, sourceId: { in: sourceIds } } });
    return result.count;
};

const toNumberArray = (value: unknown): number[] => (Array.isArray(value) ? value.filter((item): item is number => typeof item === 'number') : []);

const listActiveChunks = async (): Promise<StoredChunkV2[]> => {
    const rows = await prisma.knowledgeChunk.findMany({
        where: { document: { kbVersion: KB_V2_VERSION, status: 'ACTIVE' }, metadata: { not: Prisma.DbNull } },
        select: { id: true, content: true, embedding: true, metadata: true },
    });
    return rows.flatMap((row) => (
        isChunkMetadata(row.metadata)
            ? [{ id: row.id, content: row.content, embedding: toNumberArray(row.embedding), metadata: row.metadata }]
            : []
    ));
};

export const createPrismaKbV2Store = (): KbV2Store => ({ listIndexedDocuments, replaceDocument, removeDocuments, listActiveChunks });
