// Shared contract for the RAG v2 knowledge base (server/knowledge/ddc-knowledge-v2): used by the
// loader/validator/indexer here and by the layered retriever + draft pipeline in
// ai-email-assistant, hence a standalone types file.

export const KNOWLEDGE_PRIORITIES = ['rules', 'factual', 'faq', 'example'] as const;
export type KnowledgePriority = typeof KNOWLEDGE_PRIORITIES[number];

export const KNOWLEDGE_LANGUAGES = ['canonical', 'ru', 'uk', 'nl', 'en'] as const;
export type KnowledgeLanguage = typeof KNOWLEDGE_LANGUAGES[number];

export const KNOWLEDGE_CATEGORIES = [
    'brand', 'location', 'style', 'class', 'schedule', 'registration', 'pricing', 'faq',
    'camp', 'rule', 'example', 'response_style', 'source', 'meta',
] as const;
export type KnowledgeCategoryV2 = typeof KNOWLEDGE_CATEGORIES[number];

export interface KnowledgeMetadataV2 {
    id: string;
    version?: number;
    category: KnowledgeCategoryV2;
    topic?: string;
    subtopic?: string;
    city?: string;
    style?: string;
    ageGroup?: string;
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
    sourceUrl?: string;
    // sha256 of the raw file (front matter included), so a metadata-only edit still re-indexes.
    contentHash: string;
    hasFrontMatter: boolean;
    // Raw front matter keys as written (snake_case) — the validator needs to know which fields
    // were declared by the author vs inferred from the path.
    frontMatterKeys: string[];
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
