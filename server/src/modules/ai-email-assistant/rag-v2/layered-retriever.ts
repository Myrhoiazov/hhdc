import { cosineSimilarity, type EmbeddingClient, type KbV2Store, type KnowledgeChunkMetadataV2, type StoredChunkV2 } from '../../knowledge-ingestion';
import type { FactTarget, RetrievalPlan } from './retrieval-planner';

// Layered RAG v2 retrieval: one query embedding, then per layer (rules → facts → FAQ → examples)
// a metadata filter first and semantic ranking second. Metadata bonuses (~0.3–1.0) dominate
// cosine differences (~0.05–0.2 between relevant chunks), so a direct city/style/topic match
// always outranks a merely similar-sounding chunk.

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
    store: Pick<KbV2Store, 'listActiveChunks'>;
    now?: () => Date;
}

interface SemanticChunk extends StoredChunkV2 { semanticScore: number }

const BONUS = { category: 0.3, city: 1.0, style: 0.6, document: 0.5, topic: 0.3, topicOrder: 0.05, preferredSection: 0.5, subtopic: 1.0, primaryTopic: 0.3, targetOrder: 0.15, freshness: 0.05 };
const NEAR_DUPLICATE_JACCARD = 0.8;
const EXCLUDED_FACT_CATEGORIES = ['source', 'meta', 'response_style'];
// For these categories a known city is mandatory: the all-cities overview is noise next to the
// Rotterdam card when the customer asked about Rotterdam.
const CITY_SCOPED_CATEGORIES = ['location', 'schedule'];
const MAX_FACT_CHUNKS_PER_DOCUMENT = 2;

export const EMPTY_LAYERED_KNOWLEDGE: LayeredKnowledge = { rules: [], facts: [], faq: [], examples: [] };

const toRetrieved = (chunk: SemanticChunk, score: number): RetrievedChunk => ({
    id: chunk.id, chunkId: chunk.metadata.chunkId, documentId: chunk.metadata.documentId,
    content: chunk.content, score: Number(score.toFixed(4)), semanticScore: Number(chunk.semanticScore.toFixed(4)), metadata: chunk.metadata,
});

// Entity filter shared by facts and FAQ: a requested entity must match exactly; when no entity
// was requested, entity-specific chunks are excluded (no city given → no per-city schedule), so
// the model asks instead of picking an arbitrary city.
const entityBonus = (chunkValue: string | undefined, wanted: string | undefined, bonus: number): number | null => {
    if (!wanted) return chunkValue ? null : 0;
    if (!chunkValue) return 0;
    return chunkValue === wanted ? bonus : null;
};

export const matchFactTarget = (metadata: KnowledgeChunkMetadataV2, target: FactTarget): number | null => {
    if (metadata.category !== target.category) return null;
    if (target.documentIds && !target.documentIds.includes(metadata.documentId)) return null;
    if (target.topic && metadata.topic !== target.topic) return null;
    if (target.city && !metadata.city && CITY_SCOPED_CATEGORIES.includes(metadata.category)) return null;
    const city = entityBonus(metadata.city, target.city, BONUS.city);
    const style = entityBonus(metadata.style, target.style, BONUS.style);
    if (city === null || style === null) return null;
    return BONUS.category + city + style + (target.documentIds ? BONUS.document : 0);
};

export const freshnessBonus = (metadata: KnowledgeChunkMetadataV2, now: Date): number => {
    if (!metadata.dynamic || !metadata.lastVerified) return 0;
    const ageDays = Math.max(0, (now.getTime() - Date.parse(`${metadata.lastVerified}T00:00:00Z`)) / 86_400_000);
    return BONUS.freshness * (1 - Math.min(ageDays, 365) / 365);
};

const lineSet = (content: string) => new Set(content.split('\n').slice(1).map((line) => line.trim().toLowerCase()).filter(Boolean));

export const isNearDuplicate = (left: string, right: string): boolean => {
    const a = lineSet(left);
    const b = lineSet(right);
    if (!a.size || !b.size) return false;
    const intersection = Array.from(a).filter((line) => b.has(line)).length;
    return intersection / (a.size + b.size - intersection) >= NEAR_DUPLICATE_JACCARD;
};

const pushUnique = (selected: RetrievedChunk[], candidate: RetrievedChunk, perDocumentCap = Infinity): void => {
    if (selected.some((chunk) => chunk.id === candidate.id || isNearDuplicate(chunk.content, candidate.content))) return;
    if (selected.filter((chunk) => chunk.documentId === candidate.documentId).length >= perDocumentCap) return;
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

// Plan topics are ordered primary intent first, so earlier topics get a slightly larger bonus
// (a payment question prefers the payment rule over the generic escalation list).
const ruleTopicBonus = (topic: string | undefined, topics: string[]): number => {
    if (!topic || topic === 'general') return 0;
    return BONUS.topic + BONUS.topicOrder * (topics.length - topics.indexOf(topic));
};

const selectRules = (chunks: SemanticChunk[], plan: RetrievalPlan): RetrievedChunk[] => takeTop(chunks
    .filter((chunk) => chunk.metadata.priority === 'rules' && chunk.metadata.category === 'rule' && plan.rules.topics.includes(chunk.metadata.topic ?? 'general') && !plan.rules.excludedSections.includes(chunk.metadata.section))
    .map((chunk) => toRetrieved(chunk, chunk.semanticScore
        + ruleTopicBonus(chunk.metadata.topic, plan.rules.topics)
        + (plan.rules.preferredSections.includes(chunk.metadata.section) ? BONUS.preferredSection : 0))), plan.limits.rules);

interface FactCandidate { chunk: RetrievedChunk; targetIndexes: number[] }

const scoreFactCandidate = (chunk: SemanticChunk, targets: FactTarget[], now: Date): FactCandidate | null => {
    const matches = targets.map((target, index) => ({ index, bonus: matchFactTarget(chunk.metadata, target) })).filter((match): match is { index: number; bonus: number } => match.bonus !== null);
    if (!matches.length) return null;
    const best = Math.max(...matches.map((match) => match.bonus + BONUS.targetOrder * (1 - match.index / targets.length)));
    return { chunk: toRetrieved(chunk, chunk.semanticScore + best + freshnessBonus(chunk.metadata, now)), targetIndexes: matches.map((match) => match.index) };
};

// Coverage first (best chunk for each target, in plan order — so "location + schedule" both
// make it in), then the remaining slots by score.
const selectFacts = (chunks: SemanticChunk[], plan: RetrievalPlan, now: Date): RetrievedChunk[] => {
    const candidates = chunks
        .filter((chunk) => chunk.metadata.priority === 'factual' && !EXCLUDED_FACT_CATEGORIES.includes(chunk.metadata.category))
        .map((chunk) => scoreFactCandidate(chunk, plan.facts, now))
        .filter((candidate): candidate is FactCandidate => candidate !== null)
        .sort((a, b) => b.chunk.score - a.chunk.score);
    const selected: RetrievedChunk[] = [];
    // Documents the plan names explicitly (e.g. camp_pricing) may fill every slot — the per-document
    // cap only exists to keep one loosely matching document from crowding out the others.
    const explicit = new Set(plan.facts.flatMap((target) => target.documentIds ?? []));
    const add = (chunk: RetrievedChunk) => { if (selected.length < plan.limits.facts) pushUnique(selected, chunk, explicit.has(chunk.documentId) ? Infinity : MAX_FACT_CHUNKS_PER_DOCUMENT); };
    plan.facts.forEach((_target, index) => {
        const best = candidates.find((candidate) => candidate.targetIndexes.includes(index) && !selected.some((chunk) => chunk.id === candidate.chunk.id));
        if (best) add(best.chunk);
    });
    candidates.forEach((candidate) => add(candidate.chunk));
    return selected.sort((a, b) => b.score - a.score);
};

const selectFaq = (chunks: SemanticChunk[], plan: RetrievalPlan): RetrievedChunk[] => takeTop(chunks
    .filter((chunk) => chunk.metadata.priority === 'faq' && plan.faq.topics.includes(chunk.metadata.topic ?? ''))
    .flatMap((chunk) => {
        const city = chunk.metadata.city && plan.faq.city !== chunk.metadata.city ? null : chunk.metadata.city ? BONUS.city : 0;
        return city === null ? [] : [toRetrieved(chunk, chunk.semanticScore + city)];
    }), plan.limits.faq);

// Exact language only: a Russian example next to a Dutch email invites the small model to answer
// in Russian. No same-language example → no example (style then comes from the prompt alone).
const selectExamples = (chunks: SemanticChunk[], plan: RetrievalPlan): RetrievedChunk[] => takeTop(chunks
    .filter((chunk) => chunk.metadata.priority === 'example' && chunk.metadata.language === plan.examples.language && plan.examples.topics.includes(chunk.metadata.topic ?? ''))
    .map((chunk) => toRetrieved(chunk, chunk.semanticScore
        + (plan.examples.subtopic && chunk.metadata.subtopic === plan.examples.subtopic ? BONUS.subtopic : 0)
        + (chunk.metadata.topic === plan.examples.topics[0] ? BONUS.primaryTopic : 0))), plan.limits.examples);

export const retrieveLayeredKnowledge = async (query: string, plan: RetrievalPlan, deps: LayeredRetrieverDeps): Promise<LayeredKnowledge> => {
    const stored = await deps.store.listActiveChunks();
    if (!stored.length) return EMPTY_LAYERED_KNOWLEDGE;
    const vector = await deps.embeddings.embed(query);
    const chunks = stored.map((chunk) => ({ ...chunk, semanticScore: cosineSimilarity(vector, chunk.embedding) }));
    const now = deps.now?.() ?? new Date();
    return { rules: selectRules(chunks, plan), facts: selectFacts(chunks, plan, now), faq: selectFaq(chunks, plan), examples: selectExamples(chunks, plan) };
};
