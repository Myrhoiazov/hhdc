import { ApiError } from '../../common/http';
import { retrieveKnowledge, createKbV2Store, type RetrievedKnowledge } from '../knowledge/service';
import { configuredAiProvider, type AiSelection } from './registry';
import { meterProvider, type StageMetric } from './metering';
import { deterministicSpamReason, type EmailClassification, type NormalizedEmailInput } from './email-classification';
import type { CrmContactProjection, CrmContext } from './email-draft.types';
import { createEmailLlm, type EmailLlm } from './email-llm';
import { EMAIL_PROMPT_KEYS, resolveEmailPrompt } from './email-prompts';
import { promptCharacterBudget } from './rag-v2/context-builder';
import { currentEventYear } from './rag-v2/query-understanding';
import { EMPTY_LAYERED_KNOWLEDGE, retrieveLayeredKnowledge, type LayeredKnowledge, type RetrievedChunk } from './rag-v2/layered-retriever';
import { generateRagV2Draft, type RagV2DraftDeps, type RagV2DraftResult } from './rag-v2/rag-v2-draft.service';
import type { RetrievalLimits, RetrievalPlan } from './rag-v2/retrieval-planner';

export interface EmailAssistantOptions {
    eventId?: string | null;
    // Reads the customer's own records; called only when the email is about them.
    loadCrm?: () => Promise<CrmContext | null>;
    promptIds?: { classification?: string; draftBody?: string };
    // A specific connected provider and/or model instead of the default one.
    ai?: AiSelection;
    // 'advisory': a person asked for a draft, so a failed or negative classification must not
    // stop it. 'strict': the background pipeline, which drafts only what clearly needs a reply.
    mode: 'advisory' | 'strict';
}

export interface EmailAssistantRun {
    classification: EmailClassification;
    result: RagV2DraftResult | null;
    provider: string;
    model: string;
    promptVersion: string;
    metrics: StageMetric[];
}

const limit = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

export const retrievalLimits = (env: NodeJS.ProcessEnv = process.env): RetrievalLimits => ({
    rules: limit(env.RAG_RULE_LIMIT, 3), facts: limit(env.RAG_FACT_LIMIT, 4), faq: limit(env.RAG_FAQ_LIMIT, 2), examples: limit(env.RAG_EXAMPLE_LIMIT, 2),
});

const contextLength = (): number => limit(process.env.LLM_CONTEXT_LENGTH, 8192) || 8192;

// Documents written in the CRM without layer metadata still count: when the layered corpus has
// nothing (or embeddings are unavailable) the classic hybrid search supplies the facts.
export const toFallbackFact = (item: RetrievedKnowledge): RetrievedChunk => ({
    id: item.id, chunkId: item.id, documentId: item.documentId, content: `[${item.title}] ${item.content}`, score: item.score, semanticScore: item.score,
    metadata: { id: item.documentId, documentId: item.documentId, chunkId: item.id, section: '', sourcePath: `manual/${item.documentId}`, category: 'faq', language: 'canonical', priority: 'factual', dynamic: false },
});

const isEmpty = (knowledge: LayeredKnowledge) => !knowledge.rules.length && !knowledge.facts.length && !knowledge.faq.length && !knowledge.examples.length;

const layeredOrEmpty = async (query: string, plan: RetrievalPlan): Promise<LayeredKnowledge> => {
    try {
        const { provider } = await configuredAiProvider(true);
        const embeddings = { embed: async (text: string) => (await provider.embed([text]))[0] };
        return await retrieveLayeredKnowledge(query, plan, { embeddings, store: createKbV2Store(provider.model) });
    } catch { return EMPTY_LAYERED_KNOWLEDGE; }
};

const retrieve = async (query: string, plan: RetrievalPlan, eventId: string | null): Promise<LayeredKnowledge> => {
    const layered = await layeredOrEmpty(query, plan);
    if (!isEmpty(layered)) return layered;
    const fallback = await retrieveKnowledge(query.slice(0, 500), eventId);
    return { ...EMPTY_LAYERED_KNOWLEDGE, facts: fallback.slice(0, plan.limits.facts || 4).map(toFallbackFact) };
};

const BASE_CLASSIFICATION: EmailClassification = {
    spam: false, needsReply: true, replyLanguage: 'unknown', intent: 'other', secondaryIntents: [],
    needsCRM: false, needsKnowledge: true, needsHumanAction: false, urgency: 'normal', confidence: 0.5,
};
// Classification failed for a draft a person asked for: keywords and the routing table still apply.
const ADVISORY_CLASSIFICATION = BASE_CLASSIFICATION;
const SPAM_CLASSIFICATION: EmailClassification = { ...BASE_CLASSIFICATION, spam: true, needsReply: false, needsKnowledge: false, confidence: 1 };

const classify = async (email: NormalizedEmailInput, llm: EmailLlm, mode: EmailAssistantOptions['mode']): Promise<EmailClassification> => {
    const spamReason = deterministicSpamReason({ fromAddress: email.fromAddress, subject: email.subject, text: email.normalizedBody }, email);
    if (spamReason) return SPAM_CLASSIFICATION;
    try { return await llm.classifyEmail(email); }
    catch (error) {
        if (mode === 'strict') throw error;
        return ADVISORY_CLASSIFICATION;
    }
};

const loadAssistant = async (options: EmailAssistantOptions) => {
    const { provider: raw, connection } = await configuredAiProvider(false, options.ai);
    const metrics: StageMetric[] = [];
    const provider = meterProvider(raw, connection.provider, { metrics });
    const classification = await resolveEmailPrompt(EMAIL_PROMPT_KEYS.classification, options.promptIds?.classification);
    const draftBody = await resolveEmailPrompt(EMAIL_PROMPT_KEYS.draftBody, options.promptIds?.draftBody);
    const llm = createEmailLlm({ provider, prompts: { classification: classification.content, draftBody: draftBody.content }, contextLength: contextLength() });
    return { llm, metrics, provider: connection.provider, promptVersion: `${draftBody.version};${classification.version};rag-v2` };
};

// Classify → understand and route → CRM lookup → layered retrieval → generate → evidence gate.
export const runEmailAssistant = async (email: NormalizedEmailInput, contact: CrmContactProjection | null, options: EmailAssistantOptions): Promise<EmailAssistantRun> => {
    if (!email.normalizedBody && !email.subject) throw new ApiError(400, 'EMPTY_EMAIL', 'The email has no text to answer');
    const { llm, promptVersion, metrics, provider } = await loadAssistant(options);
    const classified = await classify(email, llm, options.mode);
    const classification = options.mode === 'advisory' ? { ...classified, spam: false, needsReply: true } : classified;
    const run = { classification: classified, provider, model: llm.model, promptVersion, metrics };
    if (classification.spam || !classification.needsReply) return { ...run, result: null };
    const deps: RagV2DraftDeps = {
        draftClient: llm, limits: retrievalLimits(), characterBudget: promptCharacterBudget(contextLength()),
        currentEventYear: currentEventYear(), loadCrm: options.loadCrm,
        retrieve: (query, plan) => retrieve(query, plan, options.eventId ?? null),
    };
    return { ...run, result: await generateRagV2Draft({ email, classification, contact }, deps) };
};
