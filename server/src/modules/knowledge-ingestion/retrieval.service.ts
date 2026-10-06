import { aiConfig } from '../../config/ai.config';
import type { EmbeddingClient, KnowledgeRepository, ScoredKnowledgeChunk } from './embedding.service';
import { Bm25Search } from './bm25.service';
import { fuseRankedLists } from './rrf.service';
import type { QueryExpansion, QueryExpansionClient } from './query-expansion.service';
import type { KnowledgeReranker } from './reranker.service';

export interface RetrievalOptions {
    topK?: number;
    minimumScore?: number;
}

export interface RetrievalResult {
    chunks: ScoredKnowledgeChunk[];
    queryExpansion: QueryExpansion | null;
}

export interface KnowledgeRetrievalServiceOptions {
    // Both optional and off unless explicitly injected — see aiConfig.ragQueryExpansionEnabled/
    // ragRerankEnabled for how production call sites gate these, and simulation.service.ts for
    // how the admin test panel always makes them available regardless of that flag.
    queryExpansion?: QueryExpansionClient;
    reranker?: KnowledgeReranker;
    onMetric?: (metric: { durationMs: number }) => void;
}

// The repository's cosine-similarity search already scores the entire active-chunk corpus
// internally before slicing to the requested limit (see MysqlKnowledgeRepository/
// InMemoryKnowledgeRepository.search) — requesting a large pool here is "don't truncate before
// hybrid fusion has a chance to re-rank", not an extra query. The real knowledge base (~50
// documents / a few hundred chunks) is nowhere near this size.
const CANDIDATE_POOL_SIZE = 500;

export class KnowledgeRetrievalService {
    private readonly queryExpansion?: QueryExpansionClient;
    private readonly reranker?: KnowledgeReranker;
    private readonly onMetric?: (metric: { durationMs: number }) => void;

    public constructor(
        private readonly embeddings: EmbeddingClient,
        private readonly repository: KnowledgeRepository,
        options: KnowledgeRetrievalServiceOptions = {},
    ) {
        this.queryExpansion = options.queryExpansion;
        this.reranker = options.reranker;
        this.onMetric = options.onMetric;
    }

    // retrieve() is the plain-array convenience wrapper generateEmailDraft/buildDraftContext and
    // the CLI/simulation already expect; retrieveWithDetails() is for callers (the simulation
    // panel) that also want to display what query expansion did.
    public async retrieve(query: string, options: RetrievalOptions = {}): Promise<ScoredKnowledgeChunk[]> {
        return (await this.retrieveWithDetails(query, options)).chunks;
    }

    public async retrieveWithDetails(query: string, options: RetrievalOptions = {}): Promise<RetrievalResult> {
        const topK = options.topK ?? aiConfig.ragTopK;
        const minimumScore = options.minimumScore ?? 0.35;

        const { expansion, vectorQuery, bm25Query } = await this.resolveExpansion(query);

        const embedStart = Date.now();
        const vector = await this.embeddings.embed(vectorQuery);
        this.onMetric?.({ durationMs: Date.now() - embedStart });
        const candidates = await this.repository.search(vector, CANDIDATE_POOL_SIZE);

        // The semantic relevance bar (minimumScore) and de-dup are applied exactly as before
        // hybrid search existed, on the plain cosine score — BM25/RRF/reranker only re-rank and
        // re-select among chunks that already clear this bar, never surfacing one vector search
        // itself would have rejected. This keeps the returned `score` field a plain cosine
        // similarity (downstream confidence math in ollama.client.ts's CONFIDENT_KNOWLEDGE_SCORE
        // is keyed off it) and keeps the hybrid upgrade purely additive: strictly re-ranks/
        // re-selects within the previously-qualifying set, never expands it.
        const qualified = this.selectQualifiedCandidates(candidates, minimumScore);
        if (!qualified.length) return { chunks: [], queryExpansion: expansion };

        const fused = await this.fuseAndRerank(qualified, bm25Query, query);
        return { chunks: fused.slice(0, topK), queryExpansion: expansion };
    }

    // Best-effort only: OllamaQueryExpansionClient itself already falls back to the original
    // query on any failure, but an injected test double could still throw, so this is not
    // allowed to take retrieval down.
    private async resolveExpansion(query: string): Promise<{ expansion: QueryExpansion | null; vectorQuery: string; bm25Query: string }> {
        let expansion: QueryExpansion | null = null;
        if (this.queryExpansion) {
            try { expansion = await this.queryExpansion.expand(query); } catch { expansion = null; }
        }
        const vectorQuery = expansion?.cleanQuery || query;
        // BM25 sees the expanded keywords *and* the original raw query text (not just the cleaned
        // version) — matches the rag/ reference's own wiring, maximizing literal term coverage.
        const bm25Query = expansion?.keywords.length ? `${expansion.keywords.join(' ')} ${query}` : query;
        return { expansion, vectorQuery, bm25Query };
    }

    private selectQualifiedCandidates(candidates: ScoredKnowledgeChunk[], minimumScore: number): ScoredKnowledgeChunk[] {
        const seen = new Set<string>();
        return candidates
            .filter((chunk) => chunk.score >= minimumScore)
            .filter((chunk) => {
                const key = `${chunk.documentId}:${chunk.contentHash}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }

    // `qualified` is already vector-rank order (the repository sorts by score desc). BM25 over
    // the same qualifying set surfaces exact keyword/term matches vector similarity can
    // under-rank; when the query shares no literal terms with any chunk, Bm25Search returns an
    // empty list and RRF degrades to plain vector-rank order.
    private async fuseAndRerank(qualified: ScoredKnowledgeChunk[], bm25Query: string, rawQuery: string): Promise<ScoredKnowledgeChunk[]> {
        const bm25Ranked = new Bm25Search(qualified).search(bm25Query).map((scored) => scored.doc);
        let fused = fuseRankedLists(qualified, bm25Ranked);

        if (this.reranker) {
            try { fused = await this.reranker.rerank(rawQuery, fused, fused.length); } catch { /* keep RRF order */ }
        }

        return fused;
    }
}
