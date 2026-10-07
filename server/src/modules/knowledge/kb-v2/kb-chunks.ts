import { chunkKnowledge } from '../chunk';
import { buildKnowledgeDocumentV2 } from './kb-document';
import { parseFrontMatter } from './front-matter';
import { chunkKnowledgeDocumentV2 } from './markdown-chunker';

export const KB_V2_SOURCE_TYPE = 'KB_V2';
export const KB_V2_URL_PREFIX = 'kb-v2://';
// Marks a chunk as part of the layered (RAG v2) corpus.
export const KB_V2_MARKER = 'v2';

export interface ChunkSource { id: string; content: string; sourceType: string; sourceUrl: string | null }
export interface DocumentChunk { content: string; metadata: Record<string, unknown> }

export const kbV2SourceUrl = (relativePath: string): string => `${KB_V2_URL_PREFIX}${relativePath}`;

// The path a document is filed under decides its default layer (rules / facts / FAQ / examples).
// Imported files keep their knowledge-base path; a document written in the CRM takes part in
// RAG v2 only when its text starts with a front matter block that says where it belongs.
export const kbV2Path = (document: ChunkSource): string | null => {
    if (document.sourceType === KB_V2_SOURCE_TYPE && document.sourceUrl?.startsWith(KB_V2_URL_PREFIX)) return document.sourceUrl.slice(KB_V2_URL_PREFIX.length);
    return parseFrontMatter(document.content).hasFrontMatter ? `manual/${document.id}.md` : null;
};

const plainChunks = (content: string): DocumentChunk[] => chunkKnowledge(content).map(text => ({ content: text, metadata: {} }));

export const documentChunks = (document: ChunkSource): DocumentChunk[] => {
    const relativePath = kbV2Path(document);
    if (!relativePath) return plainChunks(document.content);
    const chunks = chunkKnowledgeDocumentV2(buildKnowledgeDocumentV2(relativePath, document.content));
    // JSON round trip drops undefined fields, which the JSON column cannot store.
    return chunks.map(chunk => ({ content: chunk.content, metadata: JSON.parse(JSON.stringify({ ...chunk.metadata, kb: KB_V2_MARKER })) }));
};
