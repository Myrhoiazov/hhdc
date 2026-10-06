import { aiConfig, type AiConfig } from '../../config/ai.config';
import { cosineSimilarity, type EmbeddingClient, type ScoredKnowledgeChunk } from './embedding.service';

export interface KnowledgeReranker {
    rerank(query: string, candidates: ScoredKnowledgeChunk[], topK: number): Promise<ScoredKnowledgeChunk[]>;
}

interface OllamaRerankResult {
    index?: number;
    relevance_score?: number;
}

// Cross-encoder reranking via Ollama's native `/api/rerank` endpoint, ported from the rag/
// reference project's src/reranker.ts, with a bi-encoder (re-embed + cosine similarity) fallback
// when that endpoint or the configured rerank model is unavailable — most Ollama builds/models
// don't expose `/api/rerank` yet, so the bi-encoder path is the realistic common case here. Order
// only: unlike vector search, this never overwrites a chunk's `score` field — that stays the
// plain cosine similarity `KnowledgeRetrievalService` computed, which `ollama.client.ts`'s
// CONFIDENT_KNOWLEDGE_SCORE threshold depends on.
export interface RerankMetric {
    durationMs: number;
    callCount: number;
    model: string;
    meta: { nativeRerankUsed: boolean; candidateCount: number };
}

export class OllamaReranker implements KnowledgeReranker {
    private readonly config: AiConfig;
    private readonly embeddings: EmbeddingClient;
    private readonly fetchImpl: typeof fetch;
    private readonly onMetric?: (metric: RerankMetric) => void;

    public constructor(embeddings: EmbeddingClient, options: { config?: AiConfig; fetchImpl?: typeof fetch; onMetric?: (metric: RerankMetric) => void } = {}) {
        this.config = options.config ?? aiConfig;
        this.embeddings = embeddings;
        this.fetchImpl = options.fetchImpl ?? fetch;
        this.onMetric = options.onMetric;
    }

    public async rerank(query: string, candidates: ScoredKnowledgeChunk[], topK: number): Promise<ScoredKnowledgeChunk[]> {
        if (!candidates.length) return candidates;
        const nativeStart = Date.now();
        const native = await this.tryNativeRerank(query, candidates);
        if (native) {
            this.onMetric?.({
                durationMs: Date.now() - nativeStart, callCount: 1, model: this.config.ragRerankModel,
                meta: { nativeRerankUsed: true, candidateCount: candidates.length },
            });
            return native.slice(0, topK);
        }
        try {
            const bySimilarity = await this.rerankBySimilarity(query, candidates);
            return bySimilarity.slice(0, topK);
        } catch {
            return candidates.slice(0, topK);
        }
    }

    private async tryNativeRerank(query: string, candidates: ScoredKnowledgeChunk[]): Promise<ScoredKnowledgeChunk[] | null> {
        try {
            const response = await this.fetchImpl(`${this.config.ollamaUrl.replace(/\/$/, '')}/api/rerank`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ model: this.config.ragRerankModel, query, documents: candidates.map((candidate) => candidate.content) }),
            });
            if (!response.ok) return null;
            const data = await response.json() as { results?: OllamaRerankResult[] };
            const results = Array.isArray(data.results) ? data.results : [];
            const ranked = results
                .filter((result): result is Required<OllamaRerankResult> => typeof result.index === 'number' && candidates[result.index] !== undefined)
                .map((result) => ({ candidate: candidates[result.index], relevance: result.relevance_score ?? 0 }))
                .sort((a, b) => b.relevance - a.relevance)
                .map((entry) => entry.candidate);
            return ranked.length ? ranked : null;
        } catch {
            return null;
        }
    }

    private async rerankBySimilarity(query: string, candidates: ScoredKnowledgeChunk[]): Promise<ScoredKnowledgeChunk[]> {
        const start = Date.now();
        const queryVector = await this.embeddings.embed(query);
        const scored: Array<{ candidate: ScoredKnowledgeChunk; similarity: number }> = [];
        for (const candidate of candidates) {
            const candidateVector = await this.embeddings.embed(candidate.content);
            scored.push({ candidate, similarity: cosineSimilarity(queryVector, candidateVector) });
        }
        this.onMetric?.({
            durationMs: Date.now() - start, callCount: candidates.length + 1, model: this.config.ollamaEmbeddingModel,
            meta: { nativeRerankUsed: false, candidateCount: candidates.length },
        });
        return scored.sort((a, b) => b.similarity - a.similarity).map((entry) => entry.candidate);
    }
}
