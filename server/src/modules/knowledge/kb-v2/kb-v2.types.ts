// Shared contract for the layered (RAG v2) knowledge base — server/knowledge/hhdc-knowledge-v1
// and -v2: used by the loader and chunker here and by the retriever and draft pipeline in ai/.

export const KNOWLEDGE_PRIORITIES = ['rules', 'factual', 'faq', 'example'] as const;
export type KnowledgePriority = typeof KNOWLEDGE_PRIORITIES[number];

export const KNOWLEDGE_LANGUAGES = ['canonical', 'ru', 'uk', 'nl', 'en'] as const;
export type KnowledgeLanguage = typeof KNOWLEDGE_LANGUAGES[number];

export const KNOWLEDGE_CATEGORIES = [
    'brand', 'event', 'pricing', 'ticket', 'competition', 'choreographer', 'policy', 'faq',
    'rule', 'example', 'meta',
] as const;
export type KnowledgeCategoryV2 = typeof KNOWLEDGE_CATEGORIES[number];

export interface KnowledgeMetadataV2 {
    id: string;
    version?: number;
    category: KnowledgeCategoryV2;
    topic?: string;
    subtopic?: string;
    // The edition a fact was published for. A fact of another year is legacy for the current event.
    eventYear?: number;
    // Editorial state as written by the author: confirmed, legacy, needs_verification, …
    status?: string;
    language: KnowledgeLanguage;
    priority: KnowledgePriority;
    dynamic: boolean;
    lastVerified?: string;
    source?: string;
}

export interface KnowledgeDocumentV2 {
    metadata: KnowledgeMetadataV2;
    title: string;
    // Markdown body without the front matter block — YAML is metadata, never embedded as prose.
    content: string;
    sourcePath: string;
    hasFrontMatter: boolean;
    frontMatterError?: string;
}

export interface KnowledgeChunkMetadataV2 extends KnowledgeMetadataV2 {
    documentId: string;
    chunkId: string;
    section: string;
    sourcePath: string;
}

export interface KnowledgeChunkV2 {
    chunkId: string;
    documentId: string;
    ordinal: number;
    headingPath: string[];
    content: string;
    metadata: KnowledgeChunkMetadataV2;
}
