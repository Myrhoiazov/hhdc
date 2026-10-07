import type { KnowledgeChunkMetadataV2 } from './kb-v2.types';

export interface StoredChunkV2 {
    id: string;
    content: string;
    embedding: number[];
    metadata: KnowledgeChunkMetadataV2;
}

// What the layered retriever needs from storage: every embedded RAG v2 chunk of an active document.
export interface KbV2Store {
    listActiveChunks(): Promise<StoredChunkV2[]>;
}
