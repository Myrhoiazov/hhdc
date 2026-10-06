import { randomUUID } from 'node:crypto';
import { logger } from '../../../common/logger';
import type { CrmContactProjection, DraftKnowledgeContext, DraftLlmClient, EmailDraft } from '../draft.service';
import type { DraftKnowledgeRefInput } from '../draft.persistence';
import type { EmailClassification, NormalizedEmailInput } from '../email-assistant.service';
import { promptCharacterBudget, type RagV2Prompt } from './context-builder';
import { describeWarnings, validateGrounding, type GroundingResult } from './grounding-validator';
import { matchFactTarget, type LayeredKnowledge, type RetrievedChunk } from './layered-retriever';
import { understandQuery } from './query-understanding';
import { buildRetrievalPlan, type RetrievalLimits, type RetrievalPlan } from './retrieval-planner';
import type { ConfidenceLevel, QueryUnderstanding } from './rag-v2.types';

// RAG v2 draft orchestration: understand → plan → layered retrieve → generate → validate, with at
// most ONE regeneration on a grounding failure; a second failure marks the draft for staff review
// instead of retrying again.

export interface RagV2DraftDeps {
    draftClient: DraftLlmClient;
    retrieve: (query: string, plan: RetrievalPlan) => Promise<LayeredKnowledge>;
    limits: RetrievalLimits;
    // Fallback budget, used only when the draft client does not report a context length.
    characterBudget: number;
    log?: (event: Record<string, unknown>) => void;
}

export interface RagV2DraftInput {
    email: NormalizedEmailInput;
    classification: EmailClassification;
    contact: CrmContactProjection | null;
    requestId?: string;
}

export interface UsedKnowledge { documentId: string; chunkId: string; layer: keyof LayeredKnowledge; score: number }

export interface RagTrace {
    version: 'v2';
    requestId: string;
    language: string;
    intent: string;
    subintent: string | null;
    secondaryIntents: string[];
    entities: QueryUnderstanding['entities'];
    retrievalPlan: RetrievalPlan;
    usedKnowledge: UsedKnowledge[];
    warnings: string[];
    confidence: ConfidenceLevel;
    needsStaffReview: boolean;
    attempts: number;
    trimmedChunkIds: string[];
    retrievalDurationMs: number;
    generationDurationMs: number;
}

export interface RagV2DraftResult {
    draft: EmailDraft;
    trace: RagTrace;
    knowledgeRefs: DraftKnowledgeRefInput[];
    // Exactly what the model saw (after budget trimming), for the simulation panel.
    knowledge: LayeredKnowledge;
    // Everything the retriever selected before trimming (evaluation/diagnostics).
    retrieved: LayeredKnowledge;
}

const MAX_GENERATION_ATTEMPTS = 2;
const CONFIDENCE_SCORES: Record<ConfidenceLevel, number> = { high: 0.9, medium: 0.6, low: 0.3 };
const LAYERS: Array<keyof LayeredKnowledge> = ['rules', 'facts', 'faq', 'examples'];

// Topics the business rules route to staff regardless of draft quality (10_business_rules/
// escalation-rules.md): complaints, cancellations/subscription changes, payment problems,
// availability without CRM confirmation.
const isStaffConfirmationTopic = (understanding: QueryUnderstanding): boolean => (
    ['complaint', 'cancellation'].includes(understanding.intent)
    || ['payment_problem', 'availability', 'teacher_attention'].includes(understanding.subintent ?? '')
    || ['freeze', 'cancel'].includes(understanding.entities.subscriptionTopic ?? '')
);

export const allChunks = (knowledge: LayeredKnowledge): Array<{ chunk: RetrievedChunk; layer: keyof LayeredKnowledge }> => (
    LAYERS.flatMap((layer) => knowledge[layer].map((chunk) => ({ chunk, layer })))
);

export const toDraftKnowledge = (chunk: RetrievedChunk): DraftKnowledgeContext => ({
    id: chunk.id, sourceUrl: `kb-v2://${chunk.metadata.sourcePath}`, content: chunk.content, score: chunk.semanticScore,
});

const factsCoverPlan = (plan: RetrievalPlan, facts: RetrievedChunk[]): boolean => (
    plan.facts.every((target) => facts.some((chunk) => matchFactTarget(chunk.metadata, target) !== null))
);

interface Assessment { confidence: ConfidenceLevel; needsStaffReview: boolean; warnings: string[] }

const assessDraft = (state: { understanding: QueryUnderstanding; plan: RetrievalPlan; included: LayeredKnowledge; validation: GroundingResult; attempts: number; trimmed: string[] }): Assessment => {
    const missingFacts = state.understanding.needsCurrentFacts && state.included.facts.length === 0;
    const staffTopic = isStaffConfirmationTopic(state.understanding);
    const warnings = [
        ...state.validation.warnings.map((warning) => (warning.value ? `${warning.code}:${warning.value}` : warning.code)),
        ...(state.attempts > 1 ? ['regenerated_after_validation'] : []),
        ...(missingFacts ? ['no_current_facts'] : []),
        ...(staffTopic ? ['staff_confirmation_topic'] : []),
        ...(state.trimmed.length ? ['context_trimmed'] : []),
    ];
    const low = !state.validation.ok || missingFacts;
    const medium = state.attempts > 1 || staffTopic || state.trimmed.length > 0 || !factsCoverPlan(state.plan, state.included.facts);
    return { confidence: low ? 'low' : medium ? 'medium' : 'high', needsStaffReview: !state.validation.ok || missingFacts || staffTopic, warnings };
};

interface GenerationOutcome { draft: EmailDraft; validation: GroundingResult; included: LayeredKnowledge; trimmed: string[]; attempts: number; durationMs: number }

// The draft client is picked at runtime (admin setting), so the budget is resolved per draft.
const resolveCharacterBudget = (deps: RagV2DraftDeps): number => (
    deps.draftClient.contextLength ? promptCharacterBudget(deps.draftClient.contextLength) : deps.characterBudget
);

const generateValidatedDraft = async (input: RagV2DraftInput, understanding: QueryUnderstanding, knowledge: LayeredKnowledge, deps: RagV2DraftDeps): Promise<GenerationOutcome> => {
    const start = Date.now();
    const characterBudget = resolveCharacterBudget(deps);
    let correction: string | undefined;
    let outcome: Omit<GenerationOutcome, 'durationMs'> | null = null;
    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS && !(outcome?.validation.ok); attempt += 1) {
        const captured: { prompt?: RagV2Prompt } = {};
        const draft = await deps.draftClient.generateDraft({
            email: input.email, classification: input.classification, contact: input.contact, knowledge: knowledge.facts.map(toDraftKnowledge),
            ragV2: { understanding, knowledge, characterBudget, correction, onPromptBuilt: (prompt) => { captured.prompt = prompt; } },
        });
        const included = captured.prompt?.included ?? knowledge;
        const validation = validateGrounding({ draft: draft.body, factsText: included.facts.map((chunk) => chunk.content).join('\n'), language: understanding.language });
        outcome = { draft, validation, included, trimmed: captured.prompt?.trimmedChunkIds ?? [], attempts: attempt };
        correction = describeWarnings(validation.warnings);
    }
    return { ...(outcome as Omit<GenerationOutcome, 'durationMs'>), durationMs: Date.now() - start };
};

const buildTrace = (base: { requestId: string; understanding: QueryUnderstanding; plan: RetrievalPlan; retrievalDurationMs: number }, outcome: GenerationOutcome, assessment: Assessment): RagTrace => ({
    version: 'v2', requestId: base.requestId, language: base.understanding.language, intent: base.understanding.intent, subintent: base.understanding.subintent,
    secondaryIntents: base.understanding.secondaryIntents, entities: base.understanding.entities, retrievalPlan: base.plan,
    usedKnowledge: allChunks(outcome.included).map(({ chunk, layer }) => ({ documentId: chunk.documentId, chunkId: chunk.chunkId, layer, score: chunk.score })),
    warnings: assessment.warnings, confidence: assessment.confidence, needsStaffReview: assessment.needsStaffReview, attempts: outcome.attempts,
    trimmedChunkIds: outcome.trimmed, retrievalDurationMs: base.retrievalDurationMs, generationDurationMs: outcome.durationMs,
});

// Structured, PII-free diagnostics: ids, intents, entities (city/age/style/topics only), scores
// and timings — never the customer message, sender address or draft text.
const logTrace = (trace: RagTrace, log: (event: Record<string, unknown>) => void = (event) => logger.info(`[RagV2] ${JSON.stringify(event)}`)): void => log({
    request_id: trace.requestId, intent: trace.intent, subintent: trace.subintent, language: trace.language,
    retrieval_plan: trace.retrievalPlan, retrieved_document_ids: trace.usedKnowledge.map((item) => item.chunkId),
    retrieval_scores: trace.usedKnowledge.map((item) => item.score), validation_warnings: trace.warnings,
    needs_staff_review: trace.needsStaffReview, confidence: trace.confidence, attempts: trace.attempts,
    retrieval_duration_ms: trace.retrievalDurationMs, generation_duration_ms: trace.generationDurationMs,
});

export const generateRagV2Draft = async (input: RagV2DraftInput, deps: RagV2DraftDeps): Promise<RagV2DraftResult> => {
    const requestId = input.requestId ?? randomUUID();
    const understanding = understandQuery({ subject: input.email.subject, body: input.email.normalizedBody, classification: input.classification });
    const plan = buildRetrievalPlan(understanding, deps.limits);
    const retrievalStart = Date.now();
    // A retrieval failure (e.g. Ollama embeddings down) propagates like in v1, so the pipeline
    // records a failed draft instead of drafting blind.
    const knowledge = await deps.retrieve(`${input.email.subject}\n${input.email.normalizedBody}`, plan);
    const retrievalDurationMs = Date.now() - retrievalStart;
    const outcome = await generateValidatedDraft(input, understanding, knowledge, deps);
    const assessment = assessDraft({ understanding, plan, included: outcome.included, validation: outcome.validation, attempts: outcome.attempts, trimmed: outcome.trimmed });
    const trace = buildTrace({ requestId, understanding, plan, retrievalDurationMs }, outcome, assessment);
    logTrace(trace, deps.log);
    const used = allChunks(outcome.included).map(({ chunk }) => chunk);
    return {
        draft: { ...outcome.draft, confidence: CONFIDENCE_SCORES[assessment.confidence], needsManualAnswer: assessment.needsStaffReview, usedKnowledgeIds: used.map((chunk) => chunk.id).slice(0, 20) },
        trace,
        knowledgeRefs: used.map((chunk) => ({ id: chunk.id, sourceUrl: `kb-v2://${chunk.metadata.sourcePath}`, score: chunk.score })),
        knowledge: outcome.included,
        retrieved: knowledge,
    };
};
