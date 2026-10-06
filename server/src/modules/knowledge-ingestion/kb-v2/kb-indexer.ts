import type { EmbeddingClient } from '../embedding.service';
import { chunkKnowledgeDocumentV2 } from './markdown-chunker';
import type { EmbeddedChunkV2, IndexedDocumentV2, KbV2Store } from './kb-v2.repository';
import type { KnowledgeDocumentV2 } from './kb-v2.types';

export interface KbIndexPlan {
    toIndex: KnowledgeDocumentV2[];
    unchanged: KnowledgeDocumentV2[];
    toRemove: string[];
}

export interface KbIndexDeps {
    embeddings: EmbeddingClient;
    store: KbV2Store;
    embeddingModel: string;
    report?: (event: Record<string, unknown>) => void;
}

export interface KbIndexResult {
    indexed: number;
    unchanged: number;
    removed: number;
    chunks: number;
    failed: Array<{ documentId: string; message: string }>;
}

// Incremental by default: a document is re-embedded only when its raw file hash changed or it
// was embedded with a different model. `full` (knowledge:reindex) re-embeds everything. Removed
// files are deleted in both modes, after the new rows are in place — the index is never empty.
export const planKnowledgeIndex = (
    documents: KnowledgeDocumentV2[],
    indexed: IndexedDocumentV2[],
    options: { embeddingModel: string; full: boolean },
): KbIndexPlan => {
    const existing = new Map(indexed.map((row) => [row.sourceId, row]));
    const isUnchanged = (document: KnowledgeDocumentV2) => {
        const row = existing.get(document.metadata.id);
        return !options.full && row?.contentHash === document.contentHash && row.embeddingModel === options.embeddingModel;
    };
    const present = new Set(documents.map((document) => document.metadata.id));
    return {
        toIndex: documents.filter((document) => !isUnchanged(document)),
        unchanged: documents.filter(isUnchanged),
        toRemove: indexed.map((row) => row.sourceId).filter((sourceId) => !present.has(sourceId)),
    };
};

const embedDocumentChunks = async (document: KnowledgeDocumentV2, embeddings: EmbeddingClient): Promise<EmbeddedChunkV2[]> => {
    const embedded: EmbeddedChunkV2[] = [];
    for (const chunk of chunkKnowledgeDocumentV2(document)) embedded.push({ ...chunk, embedding: await embeddings.embed(chunk.content) });
    return embedded;
};

const indexOneDocument = async (document: KnowledgeDocumentV2, deps: KbIndexDeps, result: KbIndexResult): Promise<void> => {
    const documentId = document.metadata.id;
    try {
        const chunks = await embedDocumentChunks(document, deps.embeddings);
        await deps.store.replaceDocument({ document, chunks, embeddingModel: deps.embeddingModel });
        result.indexed += 1;
        result.chunks += chunks.length;
        deps.report?.({ status: 'indexed', documentId, chunks: chunks.length });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.failed.push({ documentId, message });
        deps.report?.({ status: 'failed', documentId, message });
    }
};

export const indexKnowledgeBaseV2 = async (documents: KnowledgeDocumentV2[], deps: KbIndexDeps, options: { full: boolean }): Promise<KbIndexResult> => {
    const plan = planKnowledgeIndex(documents, await deps.store.listIndexedDocuments(), { embeddingModel: deps.embeddingModel, full: options.full });
    const result: KbIndexResult = { indexed: 0, unchanged: plan.unchanged.length, removed: 0, chunks: 0, failed: [] };
    for (const document of plan.toIndex) await indexOneDocument(document, deps, result);
    result.removed = await deps.store.removeDocuments(plan.toRemove);
    return result;
};
