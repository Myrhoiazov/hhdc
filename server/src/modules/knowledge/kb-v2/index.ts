export * from './kb-v2.types';
export { findAliases, findFirstAlias, normalizeAliasText, type AliasTable } from './entity-aliases';
export { parseFrontMatter, type FrontMatterResult } from './front-matter';
export { inferPathMetadata } from './path-metadata';
export { buildKnowledgeDocumentV2 } from './kb-document';
export { chunkKnowledgeDocumentV2, cleanMarkdownText, DEFAULT_V2_CHUNK_CHARACTERS } from './markdown-chunker';
export { isIgnoredKnowledgePath, loadKnowledgeBaseV2, type LoadedKnowledgeFile } from './kb-loader';
export { cosineSimilarity, type EmbeddingClient } from './similarity';
export type { KbV2Store, StoredChunkV2 } from './kb-store.types';
