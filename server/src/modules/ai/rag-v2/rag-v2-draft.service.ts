import { randomUUID } from 'node:crypto';
import { logger } from '../../../common/logger';
import type { CrmContactProjection, CrmContext, DraftKnowledgeContext, DraftKnowledgeRef, DraftLlmClient, EmailDraft } from '../email-draft.types';
import type { EmailClassification, NormalizedEmailInput } from '../email-classification';
import { promptCharacterBudget, type RagV2Prompt } from './context-builder';
import { describeWarnings, validateGrounding, type GroundingResult } from './grounding-validator';
import { matchFactTarget, type LayeredKnowledge, type RetrievedChunk } from './layered-retriever';
import { understandQuery } from './query-understanding';
import { buildRetrievalPlan, type RetrievalLimits, type RetrievalPlan } from './retrieval-planner';
import type { Answerability, ConfidenceLevel, QueryUnderstanding } from './rag-v2.types';

// Draft orchestration: understand → plan → CRM lookup (only when the question is about the
// customer's own records) → layered retrieve → generate → evidence gate, with at most ONE
// regeneration on a grounding failure; a second failure hands the draft to staff.

export interface RagV2DraftDeps {
    draftClient: DraftLlmClient;
    retrieve: (query: string, plan: RetrievalPlan) => Promise<LayeredKnowledge>;
    // Called only when the understanding says CRM data is needed (privacy minimization).
    loadCrm?: () => Promise<CrmContext | null>;
    limits: RetrievalLimits;
    currentEventYear: number;
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
    secondaryIntents: string[];
    eventYear: number;
    historical: boolean;
    needsCRM: boolean;
    crmFound: boolean;
    needsHumanAction: boolean;
    urgency: string;
    answerability: Answerability;
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
    knowledgeRefs: DraftKnowledgeRef[];
    // Exactly what the model saw (after budget trimming), for the simulation panel.
    knowledge: LayeredKnowledge;
}

const MAX_GENERATION_ATTEMPTS = 2;
const LAYERS: Array<keyof LayeredKnowledge> = ['rules', 'facts', 'faq', 'examples'];

// knowledge/hhdc-knowledge-v2/00_runtime/confidence-policy.md: confidence measures evidence
// quality, not fluency. A source that still needs verification caps it at 0.69.
const ANSWERABILITY_CONFIDENCE: Record<Answerability, number> = { ANSWERABLE: 0.9, PARTIALLY_ANSWERABLE: 0.75, CRM_REQUIRED: 0.6, HUMAN_REQUIRED: 0.6, NOT_ANSWERABLE: 0.4 };
const UNSETTLED_SOURCE_CAP = 0.69;
const SETTLED_STATUSES = ['confirmed', 'current_page', 'homepage_current', 'current_generic_terms'];

export const allChunks = (knowledge: LayeredKnowledge): Array<{ chunk: RetrievedChunk; layer: keyof LayeredKnowledge }> => (
    LAYERS.flatMap(layer => knowledge[layer].map(chunk => ({ chunk, layer })))
);

export const toDraftKnowledge = (chunk: RetrievedChunk): DraftKnowledgeContext => ({
    id: chunk.id, sourceUrl: `kb-v2://${chunk.metadata.sourcePath}`, content: chunk.content, score: chunk.semanticScore,
});

const factsCoverPlan = (plan: RetrievalPlan, facts: RetrievedChunk[]): boolean => (
    plan.facts.every(target => facts.some(chunk => matchFactTarget(chunk.metadata, target) !== null))
);

const hasUnsettledSource = (facts: RetrievedChunk[]): boolean => facts.some(chunk => chunk.metadata.status !== undefined && !SETTLED_STATUSES.includes(chunk.metadata.status));

interface AssessmentState {
    understanding: QueryUnderstanding;
    plan: RetrievalPlan;
    included: LayeredKnowledge;
    validation: GroundingResult;
    crm: CrmContext | null;
    attempts: number;
    trimmed: string[];
}

// 00_runtime/answerability.md, most restrictive state first.
export const resolveAnswerability = (state: AssessmentState): Answerability => {
    const { understanding, included } = state;
    if (understanding.needsHumanAction || !state.validation.ok) return 'HUMAN_REQUIRED';
    if (understanding.needsCRM && !state.crm?.found) return 'CRM_REQUIRED';
    if (understanding.needsKnowledge && !included.facts.length && !included.faq.length) return 'NOT_ANSWERABLE';
    const partial = state.attempts > 1 || state.trimmed.length > 0 || !factsCoverPlan(state.plan, included.facts);
    return partial ? 'PARTIALLY_ANSWERABLE' : 'ANSWERABLE';
};

interface Assessment { answerability: Answerability; confidence: number; level: ConfidenceLevel; needsStaffReview: boolean; warnings: string[] }

const confidenceLevel = (confidence: number): ConfidenceLevel => (confidence >= 0.85 ? 'high' : confidence >= 0.7 ? 'medium' : 'low');

const assessDraft = (state: AssessmentState): Assessment => {
    const answerability = resolveAnswerability(state);
    const unsettled = hasUnsettledSource(state.included.facts);
    const confidence = Math.min(ANSWERABILITY_CONFIDENCE[answerability], unsettled ? UNSETTLED_SOURCE_CAP : 1);
    const warnings = [
        ...state.validation.warnings.map(warning => (warning.value ? `${warning.code}:${warning.value}` : warning.code)),
        ...(state.attempts > 1 ? ['regenerated_after_validation'] : []),
        ...(state.understanding.needsHumanAction ? ['staff_action_required'] : []),
        ...(answerability === 'CRM_REQUIRED' ? ['crm_record_not_found'] : []),
        ...(answerability === 'NOT_ANSWERABLE' ? ['no_current_facts'] : []),
        ...(unsettled ? ['source_needs_verification'] : []),
        ...(state.trimmed.length ? ['context_trimmed'] : []),
    ];
    const needsStaffReview = answerability !== 'ANSWERABLE' && answerability !== 'PARTIALLY_ANSWERABLE';
    return { answerability, confidence, level: confidenceLevel(confidence), needsStaffReview: needsStaffReview || unsettled, warnings };
};

interface GenerationOutcome { draft: EmailDraft; validation: GroundingResult; included: LayeredKnowledge; trimmed: string[]; attempts: number; durationMs: number }

interface GenerationContext { understanding: QueryUnderstanding; knowledge: LayeredKnowledge; crm: CrmContext | null }

// The draft client is picked at runtime (admin setting), so the budget is resolved per draft.
const resolveCharacterBudget = (deps: RagV2DraftDeps): number => (
    deps.draftClient.contextLength ? promptCharacterBudget(deps.draftClient.contextLength) : deps.characterBudget
);

const generateValidatedDraft = async (input: RagV2DraftInput, context: GenerationContext, deps: RagV2DraftDeps): Promise<GenerationOutcome> => {
    const start = Date.now();
    const { understanding, knowledge, crm } = context;
    const characterBudget = resolveCharacterBudget(deps);
    let correction: string | undefined;
    let outcome: Omit<GenerationOutcome, 'durationMs'> | null = null;
    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS && !(outcome?.validation.ok); attempt += 1) {
        const captured: { prompt?: RagV2Prompt } = {};
        const draft = await deps.draftClient.generateDraft({
            email: input.email, classification: input.classification, contact: input.contact, knowledge: knowledge.facts.map(toDraftKnowledge),
            ragV2: { understanding, knowledge, characterBudget, correction, crmData: crm?.found ? crm.text : undefined, onPromptBuilt: (prompt) => { captured.prompt = prompt; } },
        });
        const included = captured.prompt?.included ?? knowledge;
        // CRM values are evidence too: a price or date quoted from the customer's own order is grounded.
        const factsText = [...included.facts.map(chunk => chunk.content), crm?.found ? crm.text : ''].join('\n');
        const validation = validateGrounding({ draft: draft.body, factsText, language: understanding.language });
        outcome = { draft, validation, included, trimmed: captured.prompt?.trimmedChunkIds ?? [], attempts: attempt };
        correction = describeWarnings(validation.warnings);
    }
    return { ...(outcome as Omit<GenerationOutcome, 'durationMs'>), durationMs: Date.now() - start };
};

interface TraceBase { requestId: string; understanding: QueryUnderstanding; plan: RetrievalPlan; crm: CrmContext | null; retrievalDurationMs: number }

const buildTrace = (base: TraceBase, outcome: GenerationOutcome, assessment: Assessment): RagTrace => ({
    version: 'v2', requestId: base.requestId, language: base.understanding.language, intent: base.understanding.intent,
    secondaryIntents: base.understanding.secondaryIntents, eventYear: base.understanding.eventYear, historical: base.understanding.historical,
    needsCRM: base.understanding.needsCRM, crmFound: Boolean(base.crm?.found), needsHumanAction: base.understanding.needsHumanAction,
    urgency: base.understanding.urgency, answerability: assessment.answerability, retrievalPlan: base.plan,
    usedKnowledge: allChunks(outcome.included).map(({ chunk, layer }) => ({ documentId: chunk.documentId, chunkId: chunk.chunkId, layer, score: chunk.score })),
    warnings: assessment.warnings, confidence: assessment.level, needsStaffReview: assessment.needsStaffReview, attempts: outcome.attempts,
    trimmedChunkIds: outcome.trimmed, retrievalDurationMs: base.retrievalDurationMs, generationDurationMs: outcome.durationMs,
});

// Structured, PII-free diagnostics: ids, intents, scores and timings — never the customer
// message, the sender address, CRM data or the draft text.
const logTrace = (trace: RagTrace, log: (event: Record<string, unknown>) => void = (event) => { logger.info(`[RagV2] ${JSON.stringify(event)}`); }): void => log({
    request_id: trace.requestId, intent: trace.intent, language: trace.language, event_year: trace.eventYear, answerability: trace.answerability,
    retrieved_chunk_ids: trace.usedKnowledge.map(item => item.chunkId), validation_warnings: trace.warnings,
    needs_staff_review: trace.needsStaffReview, confidence: trace.confidence, attempts: trace.attempts,
    retrieval_duration_ms: trace.retrievalDurationMs, generation_duration_ms: trace.generationDurationMs,
});

export const generateRagV2Draft = async (input: RagV2DraftInput, deps: RagV2DraftDeps): Promise<RagV2DraftResult> => {
    const requestId = input.requestId ?? randomUUID();
    const understanding = understandQuery({ subject: input.email.subject, body: input.email.normalizedBody, classification: input.classification, currentEventYear: deps.currentEventYear });
    const plan = buildRetrievalPlan(understanding, deps.limits);
    const retrievalStart = Date.now();
    const crm = understanding.needsCRM && deps.loadCrm ? await deps.loadCrm() : null;
    const knowledge = await deps.retrieve(`${input.email.subject}\n${input.email.normalizedBody}`, plan);
    const retrievalDurationMs = Date.now() - retrievalStart;
    const outcome = await generateValidatedDraft(input, { understanding, knowledge, crm }, deps);
    const assessment = assessDraft({ understanding, plan, included: outcome.included, validation: outcome.validation, crm, attempts: outcome.attempts, trimmed: outcome.trimmed });
    const trace = buildTrace({ requestId, understanding, plan, crm, retrievalDurationMs }, outcome, assessment);
    logTrace(trace, deps.log);
    const used = allChunks(outcome.included).map(({ chunk }) => chunk);
    return {
        draft: { ...outcome.draft, confidence: assessment.confidence, needsManualAnswer: assessment.needsStaffReview, usedKnowledgeIds: used.map(chunk => chunk.id).slice(0, 20) },
        trace,
        knowledgeRefs: used.map(chunk => ({ id: chunk.id, sourceUrl: `kb-v2://${chunk.metadata.sourcePath}`, score: chunk.score })),
        knowledge: outcome.included,
    };
};
