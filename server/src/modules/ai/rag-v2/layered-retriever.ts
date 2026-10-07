import { cosineSimilarity, type EmbeddingClient, type KbV2Store, type KnowledgeChunkMetadataV2, type StoredChunkV2 } from '../../knowledge/kb-v2';
import type { FactTarget, RetrievalPlan } from './retrieval-planner';

// Layered retrieval: one query embedding, then per layer (rules → facts → FAQ → examples) a
// metadata filter first and semantic ranking second. Metadata bonuses (~0.3–1.0) dominate cosine
// differences (~0.05–0.2 between relevant chunks), so a direct topic or event-year match always
// outranks a merely similar-sounding chunk.

export interface RetrievedChunk {
    id: string;
    chunkId: string;
    documentId: string;
    content: string;
    score: number;
    semanticScore: number;
    metadata: KnowledgeChunkMetadataV2;
}

export interface LayeredKnowledge {
    rules: RetrievedChunk[];
    facts: RetrievedChunk[];
    faq: RetrievedChunk[];
    examples: RetrievedChunk[];
}

export interface LayeredRetrieverDeps {
    embeddings: EmbeddingClient;
    store: KbV2Store;
    now?: () => Date;
}

interface SemanticChunk extends StoredChunkV2 { semanticScore: number }

const BONUS = { category: 0.3, topic: 0.4, subtopic: 0.6, year: 0.15, preferredRule: 0.5, primaryTopic: 0.3, targetOrder: 0.15, freshness: 0.05 };
const NEAR_DUPLICATE_JACCARD = 0.8;
const MAX_FACT_CHUNKS_PER_DOCUMENT = 2;

export const EMPTY_LAYERED_KNOWLEDGE: LayeredKnowledge = { rules: [], facts: [], faq: [], examples: [] };

const toRetrieved = (chunk: SemanticChunk, score: number): RetrievedChunk => ({
    id: chunk.id, chunkId: chunk.metadata.chunkId, documentId: chunk.metadata.documentId,
    content: chunk.content, score: Number(score.toFixed(4)), semanticScore: Number(chunk.semanticScore.toFixed(4)), metadata: chunk.metadata,
});

// Event-year separation: a fact published for another edition is never eligible; a fact without
// a year (generic policy) is; a fact of the asked edition is preferred.
export const yearBonus = (metadata: KnowledgeChunkMetadataV2, eventYear: number): number | null => {
    if (metadata.eventYear === undefined) return 0;
    return metadata.eventYear === eventYear ? BONUS.year : null;
};

// Whether a chunk answers a fact target, and how well; null when it does not.
export const matchFactTarget = (metadata: KnowledgeChunkMetadataV2, target: FactTarget): number | null => {
    if (metadata.category !== target.category) return null;
    if (target.topic && metadata.topic !== target.topic) return null;
    if (target.general && metadata.topic) return null;
    const subtopic = target.subtopic && metadata.subtopic === target.subtopic ? BONUS.subtopic : 0;
    return BONUS.category + (target.topic ? BONUS.topic : 0) + subtopic;
};

export const freshnessBonus = (metadata: KnowledgeChunkMetadataV2, now: Date): number => {
    if (!metadata.dynamic || !metadata.lastVerified) return 0;
    const ageDays = Math.max(0, (now.getTime() - Date.parse(`${metadata.lastVerified}T00:00:00Z`)) / 86_400_000);
    return BONUS.freshness * (1 - Math.min(ageDays, 365) / 365);
};

const lineSet = (content: string) => new Set(content.split('\n').slice(1).map(line => line.trim().toLowerCase()).filter(Boolean));

export const isNearDuplicate = (left: string, right: string): boolean => {
    const a = lineSet(left);
    const b = lineSet(right);
    if (!a.size || !b.size) return false;
    const intersection = Array.from(a).filter(line => b.has(line)).length;
    return intersection / (a.size + b.size - intersection) >= NEAR_DUPLICATE_JACCARD;
};

const pushUnique = (selected: RetrievedChunk[], candidate: RetrievedChunk, perDocumentCap = Infinity): void => {
    if (selected.some(chunk => chunk.id === candidate.id || isNearDuplicate(chunk.content, candidate.content))) return;
    if (selected.filter(chunk => chunk.documentId === candidate.documentId).length >= perDocumentCap) return;
    selected.push(candidate);
};

const takeTop = (candidates: RetrievedChunk[], limit: number): RetrievedChunk[] => {
    const selected: RetrievedChunk[] = [];
    for (const candidate of [...candidates].sort((a, b) => b.score - a.score)) {
        if (selected.length >= limit) break;
        pushUnique(selected, candidate);
    }
    return selected;
};

// Earlier preferred ids (the intent's own rules) get a slightly larger bonus than the general ones.
const preferredRuleBonus = (documentId: string, preferredIds: string[]): number => {
    const index = preferredIds.indexOf(documentId);
    return index === -1 ? 0 : BONUS.preferredRule + 0.05 * (preferredIds.length - index);
};

const selectRules = (chunks: SemanticChunk[], plan: RetrievalPlan): RetrievedChunk[] => takeTop(chunks
    .filter(chunk => chunk.metadata.priority === 'rules' && chunk.metadata.category === 'rule')
    .map(chunk => toRetrieved(chunk, chunk.semanticScore + preferredRuleBonus(chunk.metadata.documentId, plan.rules.preferredIds))), plan.limits.rules);

interface FactCandidate { chunk: RetrievedChunk; targetIndexes: number[] }

const scoreFactCandidate = (chunk: SemanticChunk, plan: RetrievalPlan, now: Date): FactCandidate | null => {
    const year = yearBonus(chunk.metadata, plan.eventYear);
    if (year === null) return null;
    const matches = plan.facts.map((target, index) => ({ index, bonus: matchFactTarget(chunk.metadata, target) })).filter((match): match is { index: number; bonus: number } => match.bonus !== null);
    if (!matches.length) return null;
    const best = Math.max(...matches.map(match => match.bonus + BONUS.targetOrder * (1 - match.index / plan.facts.length)));
    return { chunk: toRetrieved(chunk, chunk.semanticScore + best + year + freshnessBonus(chunk.metadata, now)), targetIndexes: matches.map(match => match.index) };
};

// Coverage first (the best chunk for each target, in plan order), then the remaining slots by score.
const selectFacts = (chunks: SemanticChunk[], plan: RetrievalPlan, now: Date): RetrievedChunk[] => {
    const candidates = chunks
        .filter(chunk => chunk.metadata.priority === 'factual')
        .map(chunk => scoreFactCandidate(chunk, plan, now))
        .filter((candidate): candidate is FactCandidate => candidate !== null)
        .sort((a, b) => b.chunk.score - a.chunk.score);
    const selected: RetrievedChunk[] = [];
    const add = (chunk: RetrievedChunk) => { if (selected.length < plan.limits.facts) pushUnique(selected, chunk, MAX_FACT_CHUNKS_PER_DOCUMENT); };
    plan.facts.forEach((_target, index) => {
        const best = candidates.find(candidate => candidate.targetIndexes.includes(index) && !selected.some(chunk => chunk.id === candidate.chunk.id));
        if (best) add(best.chunk);
    });
    candidates.forEach(candidate => add(candidate.chunk));
    return selected.sort((a, b) => b.score - a.score);
};

const selectFaq = (chunks: SemanticChunk[], plan: RetrievalPlan): RetrievedChunk[] => takeTop(chunks
    .filter(chunk => chunk.metadata.priority === 'faq' && plan.faq.topics.includes(chunk.metadata.topic ?? ''))
    .flatMap(chunk => {
        const year = yearBonus(chunk.metadata, plan.eventYear);
        return year === null ? [] : [toRetrieved(chunk, chunk.semanticScore + year + (chunk.metadata.topic === plan.faq.topics[0] ? BONUS.primaryTopic : 0))];
    }), plan.limits.faq);

// Exact language only: an English example next to a Russian email invites a small model to answer
// in English. No same-language example → no example (style then comes from the prompt alone).
const selectExamples = (chunks: SemanticChunk[], plan: RetrievalPlan): RetrievedChunk[] => takeTop(chunks
    .filter(chunk => chunk.metadata.priority === 'example' && chunk.metadata.language === plan.examples.language && plan.examples.topics.includes(chunk.metadata.topic ?? ''))
    .map(chunk => toRetrieved(chunk, chunk.semanticScore + (chunk.metadata.topic === plan.examples.topics[0] ? BONUS.primaryTopic : 0))), plan.limits.examples);

export const retrieveLayeredKnowledge = async (query: string, plan: RetrievalPlan, deps: LayeredRetrieverDeps): Promise<LayeredKnowledge> => {
    const stored = await deps.store.listActiveChunks();
    if (!stored.length) return EMPTY_LAYERED_KNOWLEDGE;
    const vector = await deps.embeddings.embed(query);
    const chunks = stored.map(chunk => ({ ...chunk, semanticScore: cosineSimilarity(vector, chunk.embedding) }));
    const now = deps.now?.() ?? new Date();
    return { rules: selectRules(chunks, plan), facts: selectFacts(chunks, plan, now), faq: selectFaq(chunks, plan), examples: selectExamples(chunks, plan) };
};
