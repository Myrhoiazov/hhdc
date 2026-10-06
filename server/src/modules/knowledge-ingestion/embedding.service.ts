import { aiConfig } from '../../config/ai.config';
import type { NormalizedKnowledgeDocument } from './knowledge-ingestion.service';

export interface KnowledgeChunk {
    id: string;
    documentId: string;
    sourceUrl: string;
    contentHash: string;
    ordinal: number;
    content: string;
    headingPath?: string[];
}

export interface EmbeddedKnowledgeChunk extends KnowledgeChunk {
    embedding: number[];
}

export interface ScoredKnowledgeChunk extends KnowledgeChunk {
    score: number;
}

export interface EmbeddingClient {
    embed(text: string): Promise<number[]>;
}

export interface KnowledgeRepository {
    upsertChunks(chunks: EmbeddedKnowledgeChunk[]): Promise<void>;
    search(query: number[], topK: number): Promise<ScoredKnowledgeChunk[]>;
}

// 1200 sized each retrieved chunk to overflow the 2048-token drafting context once 3-4 chunks
// were assembled into a prompt alongside the email/classification/instructions — confirmed live
// (see tasks/plan.md Task 20): a 4-chunk, ~7100-character prompt made qwen3:1.7b return an empty
// `{}` instead of a draft. Smaller chunks are also more topically focused, which spec section
// 10.6 recommends independently of the context-budget concern. Configurable via
// RAG_CHUNK_SIZE/RAG_CHUNK_OVERLAP (aiConfig.ragChunkSize/ragChunkOverlap) — every call site
// (sync.service.ts, mysql-knowledge.repository.ts) calls this with no override, so changing the
// env vars changes chunking for every ingestion path without touching call sites.
type RawKnowledgeChunk = { content: string; headingPath: string[] };

// A line is a heading marker at whatever level it declares — splice truncates any deeper
// levels still on the stack so a new H2 clears a previous H3, matching normal document outlines.
const applyHeadingLine = (headingStack: string[], line: string): void => {
    const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!heading) return;
    const level = heading[1].length;
    headingStack.splice(level - 1);
    headingStack[level - 1] = heading[2];
};

const splitIntoRawChunks = (sections: string[], maxCharacters: number): RawKnowledgeChunk[] => {
    const rawChunks: RawKnowledgeChunk[] = [];
    let current = '';
    const headingStack: string[] = [];
    const push = () => {
        if (!current) return;
        rawChunks.push({ content: current, headingPath: headingStack.filter((heading): heading is string => Boolean(heading)) });
        current = '';
    };
    for (const section of sections) {
        for (const line of section.split('\n')) applyHeadingLine(headingStack, line);
        if (section.length > maxCharacters) {
            push();
            for (let offset = 0; offset < section.length; offset += maxCharacters) {
                current = section.slice(offset, offset + maxCharacters);
                push();
            }
        } else if (current && current.length + section.length + 2 > maxCharacters) {
            push();
            current = section;
        } else {
            current = current ? `${current}\n\n${section}` : section;
        }
    }
    push();
    return rawChunks;
};

// Stitch a trailing slice of each chunk onto the next one. Chunks legitimately grow past
// maxCharacters by up to overlapCharacters for every chunk after the first — that is the
// normal cost of overlap, not a bug.
const withOverlapPrefix = (
    rawChunks: RawKnowledgeChunk[],
    document: NormalizedKnowledgeDocument,
    effectiveOverlap: number,
): KnowledgeChunk[] => rawChunks.map((chunk, index) => {
    const previous = index > 0 ? rawChunks[index - 1].content : '';
    const overlapPrefix = effectiveOverlap > 0 && previous ? previous.slice(-effectiveOverlap) : '';
    return {
        id: `${document.sourceId}:${document.contentHash}:${index}`,
        documentId: document.sourceId,
        sourceUrl: document.sourceUrl,
        contentHash: document.contentHash,
        ordinal: index,
        content: overlapPrefix ? `${overlapPrefix}\n\n${chunk.content}` : chunk.content,
        headingPath: chunk.headingPath,
    };
});

export const chunkKnowledgeDocument = (
    document: NormalizedKnowledgeDocument,
    maxCharacters = aiConfig.ragChunkSize,
    // Minimum overlap between consecutive chunks so a fact landing on a chunk boundary isn't
    // invisible to whichever half a query doesn't retrieve. This codebase budgets by character
    // count throughout (no tokenizer wired up); modern BPE tokenizers run roughly 2-2.5
    // characters/token for Cyrillic (this deployment's canonical language) and more for Latin
    // text.
    overlapCharacters = aiConfig.ragChunkOverlap,
): KnowledgeChunk[] => {
    if (!document.content.trim()) return [];
    const effectiveOverlap = Math.max(0, Math.min(overlapCharacters, maxCharacters - 1));
    const sections = document.content.split(/\n{2,}/).map((section) => section.trim()).filter(Boolean);
    const rawChunks = splitIntoRawChunks(sections, maxCharacters);
    return withOverlapPrefix(rawChunks, document, effectiveOverlap);
};

export const cosineSimilarity = (left: number[], right: number[]): number => {
    if (!left.length || left.length !== right.length) return 0;
    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;
    for (let index = 0; index < left.length; index += 1) {
        dot += left[index] * right[index];
        leftNorm += left[index] ** 2;
        rightNorm += right[index] ** 2;
    }
    return leftNorm && rightNorm ? dot / Math.sqrt(leftNorm * rightNorm) : 0;
};

export class InMemoryKnowledgeRepository implements KnowledgeRepository {
    private readonly chunks = new Map<string, EmbeddedKnowledgeChunk>();

    public async upsertChunks(chunks: EmbeddedKnowledgeChunk[]): Promise<void> {
        chunks.forEach((chunk) => this.chunks.set(chunk.id, chunk));
    }

    public async search(query: number[], topK: number): Promise<ScoredKnowledgeChunk[]> {
        return Array.from(this.chunks.values())
            .map((chunk) => ({ ...chunk, score: cosineSimilarity(query, chunk.embedding) }))
            .sort((left, right) => right.score - left.score)
            .slice(0, Math.max(0, topK));
    }
}

export interface OllamaEmbeddingClientOptions {
    url?: string;
    model?: string;
    fetchImpl?: typeof fetch;
}

export class OllamaEmbeddingClient implements EmbeddingClient {
    private readonly url: string;
    private readonly model: string;
    private readonly fetchImpl: typeof fetch;

    public constructor(options: OllamaEmbeddingClientOptions = {}) {
        this.url = (options.url ?? aiConfig.ollamaUrl).replace(/\/$/, '');
        this.model = options.model ?? aiConfig.ollamaEmbeddingModel;
        this.fetchImpl = options.fetchImpl ?? fetch;
        if (!this.model) throw new Error('OLLAMA_EMBEDDING_MODEL is required for local embeddings');
    }

    public async embed(text: string): Promise<number[]> {
        const response = await this.fetchImpl(`${this.url}/api/embed`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ model: this.model, input: text }),
        });
        if (!response.ok) throw new Error(`Ollama embedding failed with HTTP ${response.status}`);
        const body = await response.json() as { embeddings?: unknown };
        const embedding = Array.isArray(body.embeddings) && Array.isArray(body.embeddings[0]) ? body.embeddings[0] : null;
        if (!embedding || !embedding.every((value) => typeof value === 'number' && Number.isFinite(value))) {
            throw new Error('Ollama embedding response did not contain a numeric vector');
        }
        return embedding as number[];
    }
}
