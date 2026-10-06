// Shared core of scripts/test-email-flow.ts (CLI) and the "Симуляция письма" panel on
// KnowledgeBasePage (HTTP): runs the real pipeline — normalize → deterministic spam check →
// LLM classify → RAG retrieve → draft — against a hand-written subject/body, without IMAP,
// without touching ai_email_messages/ai_email_drafts, and without notifying Telegram. Read-only
// against the real CRM (contact lookup) and the real knowledge base (retrieval).
//
// Every run is persisted to ai_simulation_runs/ai_simulation_run_metrics (a separate, simulation-
// only history table — see docs/superpowers/specs/2026-09-25-simulation-metrics-design.md) so an
// admin can compare prompts/providers over time. Persistence failure is caught and logged, never
// thrown — a DB hiccup must never break the admin's simulation preview.
import { AiDraftProvider, AiSimulationStage } from '@prisma/client';
import { deterministicSpamReason, normalizeEmail, type EmailClassification, type NormalizedEmailInput } from './email-assistant.service';
import { OllamaLlmClient } from './ollama.client';
import { createPrismaCrmReader } from './crm-context.service';
import { buildDraftContext, emailDraftSchema, generateEmailDraft, type CrmContactProjection, type DraftKnowledgeContext, type DraftLlmClient, type EmailDraft } from './draft.service';
import {
    KnowledgeRetrievalService, MysqlKnowledgeRepository, OllamaEmbeddingClient,
    OllamaQueryExpansionClient, OllamaReranker, type QueryExpansion,
} from '../knowledge-ingestion';
import { aiConfig } from '../../config/ai.config';
import { createDraftProviderFactory } from './draft-provider.factory';
import type { DraftProviderName } from './draft-provider';
import { PrismaAiPromptRepository } from './prompt-library.service';
import { allChunks, generateRagV2Draft, toDraftKnowledge, type RagTrace } from './rag-v2/rag-v2-draft.service';
import { createRagV2Deps } from './rag-v2/rag-v2.factory';
import {
    buildSimulationRunMetricRow, createPrismaSimulationRunRepository,
    type SimulationRunInput, type SimulationRunMetricInput, type SimulationRunRepository,
} from './simulation-metrics.repository';

export interface EmailSimulationInput {
    from?: string;
    subject: string;
    body: string;
    topK?: number;
    noKnowledge?: boolean;
    forceDraft?: boolean;
    // Test a specific saved prompt (active or not) for this run only — lets an admin try a
    // candidate prompt without activating it, so real production emails are unaffected until
    // they explicitly activate it via /ai-email/prompts/:id/activate.
    classificationPromptId?: number;
    draftBodyPromptId?: number;
    // Both default ON for the simulation panel regardless of aiConfig.ragQueryExpansionEnabled/
    // ragRerankEnabled — an admin evaluates the real effect here before opting real production
    // emails in via .env. Opt back OUT per-run for an apples-to-apples comparison.
    noQueryExpansion?: boolean;
    noRerank?: boolean;
}

export interface EmailSimulationResult {
    normalized: NormalizedEmailInput;
    deterministicSpamReason: string | null;
    classification: EmailClassification | null;
    knowledge: DraftKnowledgeContext[];
    queryExpansion: QueryExpansion | null;
    crmContact: CrmContactProjection | null;
    draft: EmailDraft | null;
    draftSkippedReason: string | null;
    runId: number | null;
    metrics: SimulationRunMetricInput[];
    // RAG_VERSION=v2 only: intent/plan/used knowledge/warnings/confidence for the run.
    ragTrace?: RagTrace;
}

const DEFAULT_FROM = 'test@example.com';

// Pure — shapes the DB-write payload from the simulation's input/outcome. Kept separate from
// runEmailAssistantSimulation so it is unit-testable without Prisma/Ollama/network.
export const buildSimulationRunInput = (
    input: EmailSimulationInput,
    context: {
        deterministicSpamReason: string | null;
        classification: EmailClassification | null;
        draftSkippedReason: string | null;
        classificationPromptName: string | null;
        draftBodyPromptName: string | null;
        draftProvider: DraftProviderName | null;
        draftModel: string | null;
        classificationJson?: unknown;
        knowledgeJson?: unknown;
        draftJson?: unknown;
        metrics: SimulationRunMetricInput[];
        createdById?: number;
    },
): SimulationRunInput => ({
    fromAddress: input.from?.trim() || undefined,
    subject: input.subject,
    body: input.body,
    topK: input.topK,
    noKnowledge: input.noKnowledge ?? false,
    forceDraft: input.forceDraft ?? false,
    noQueryExpansion: input.noQueryExpansion ?? false,
    noRerank: input.noRerank ?? false,
    classificationPromptId: input.classificationPromptId,
    classificationPromptName: context.classificationPromptName ?? undefined,
    draftBodyPromptId: input.draftBodyPromptId,
    draftBodyPromptName: context.draftBodyPromptName ?? undefined,
    draftProvider: (context.draftProvider as AiDraftProvider | null) ?? undefined,
    draftModel: context.draftModel ?? undefined,
    classificationSpam: context.classification?.spam,
    classificationNeedsReply: context.classification?.needsReply,
    classificationConfidence: context.classification?.confidence,
    classificationJson: context.classificationJson,
    knowledgeJson: context.knowledgeJson,
    draftJson: context.draftJson,
    deterministicSpamReason: context.deterministicSpamReason ?? undefined,
    draftSkippedReason: context.draftSkippedReason ?? undefined,
    createdById: context.createdById,
    metrics: context.metrics,
});

// Resolves the human-readable names of any pinned classification/draft prompts, so the persisted
// run row is self-describing even after the prompt is later renamed or deactivated.
const resolveSimulationPromptNames = async (input: EmailSimulationInput) => {
    const promptRepository = new PrismaAiPromptRepository();
    return {
        classificationPromptName: input.classificationPromptId ? await promptRepository.getNameById(input.classificationPromptId) : null,
        draftBodyPromptName: input.draftBodyPromptId ? await promptRepository.getNameById(input.draftBodyPromptId) : null,
    };
};

const classifyForSimulation = (
    normalized: NormalizedEmailInput,
    spamReason: string | null,
    input: EmailSimulationInput,
    metrics: SimulationRunMetricInput[],
): Promise<EmailClassification | null> => {
    if (spamReason) return Promise.resolve(null);
    const classificationModel = aiConfig.ollamaModel;
    const classificationClient = new OllamaLlmClient({
        promptOverrides: { classificationPromptId: input.classificationPromptId, draftBodyPromptId: input.draftBodyPromptId },
        onMetric: (metric) => metrics.push(buildSimulationRunMetricRow(AiSimulationStage.CLASSIFICATION, AiDraftProvider.OLLAMA, classificationModel, metric)),
    });
    return classificationClient.classifyEmail(normalized);
};

interface SimulationKnowledgeResult {
    knowledge: DraftKnowledgeContext[];
    queryExpansion: QueryExpansion | null;
}

const retrieveSimulationKnowledge = async (
    normalized: NormalizedEmailInput,
    input: EmailSimulationInput,
    metrics: SimulationRunMetricInput[],
): Promise<SimulationKnowledgeResult> => {
    if (input.noKnowledge) return { knowledge: [], queryExpansion: null };
    const embeddings = new OllamaEmbeddingClient();
    const retrieval = new KnowledgeRetrievalService(embeddings, new MysqlKnowledgeRepository(), {
        queryExpansion: input.noQueryExpansion ? undefined : new OllamaQueryExpansionClient({
            onMetric: (metric) => metrics.push(buildSimulationRunMetricRow(AiSimulationStage.QUERY_EXPANSION, AiDraftProvider.OLLAMA, aiConfig.ollamaModel, metric)),
        }),
        reranker: input.noRerank ? undefined : new OllamaReranker(embeddings, {
            onMetric: (metric) => metrics.push(buildSimulationRunMetricRow(AiSimulationStage.RERANK, AiDraftProvider.OLLAMA, metric.model, metric)),
        }),
        onMetric: (metric) => metrics.push(buildSimulationRunMetricRow(AiSimulationStage.RETRIEVAL_EMBEDDING, AiDraftProvider.OLLAMA, aiConfig.ollamaEmbeddingModel, metric)),
    });
    const retrieved = await retrieval.retrieveWithDetails(`${normalized.subject}\n${normalized.normalizedBody}`, { topK: input.topK ?? aiConfig.ragTopK });
    return { knowledge: retrieved.chunks, queryExpansion: retrieved.queryExpansion };
};

interface SimulationRunPersisterDeps {
    runRepository: SimulationRunRepository;
    input: EmailSimulationInput;
    spamReason: string | null;
    classification: EmailClassification | null;
    classificationPromptName: string | null;
    draftBodyPromptName: string | null;
    knowledge: DraftKnowledgeContext[];
    metrics: SimulationRunMetricInput[];
    createdById?: number;
}

// Never throws out of runEmailAssistantSimulation — a DB hiccup must never turn a working
// simulation preview into a 500 for the admin. Logged, not surfaced.
const buildSimulationRunPersister = (deps: SimulationRunPersisterDeps) => async (extra: {
    draftSkippedReason: string | null;
    draftProvider?: DraftProviderName; draftModel?: string;
    draftJson?: unknown;
    knowledge?: DraftKnowledgeContext[];
}): Promise<number | null> => {
    try {
        const record = buildSimulationRunInput(deps.input, {
            deterministicSpamReason: deps.spamReason,
            classification: deps.classification,
            draftSkippedReason: extra.draftSkippedReason,
            classificationPromptName: deps.classificationPromptName,
            draftBodyPromptName: deps.draftBodyPromptName,
            draftProvider: extra.draftProvider ?? null,
            draftModel: extra.draftModel ?? null,
            classificationJson: deps.classification,
            knowledgeJson: extra.knowledge ?? deps.knowledge,
            draftJson: extra.draftJson,
            metrics: deps.metrics,
            createdById: deps.createdById,
        });
        return await deps.runRepository.create(record);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to persist simulation run history', error);
        return null;
    }
};

interface SimulationDraftResult {
    draft: EmailDraft;
    provider: DraftProviderName;
    model: string;
    crmContact: CrmContactProjection | null;
    ragV2?: { trace: RagTrace; knowledge: DraftKnowledgeContext[] };
}

interface SimulationDraftParams {
    input: EmailSimulationInput;
    normalized: NormalizedEmailInput;
    classification: EmailClassification;
    knowledge: DraftKnowledgeContext[];
    from: string;
    metrics: SimulationRunMetricInput[];
    useRagV2: boolean;
}

// Same orchestration as the production v2 draft cron (layered retrieval + grounding validation
// + at most one regeneration), so the panel shows exactly what RAG_VERSION=v2 would send.
const generateRagV2SimulationDraft = async (params: SimulationDraftParams, draftClient: DraftLlmClient, crmContact: CrmContactProjection | null) => {
    const result = await generateRagV2Draft(
        { email: params.normalized, classification: params.classification, contact: crmContact, requestId: `simulation-${Date.now()}` },
        { ...createRagV2Deps(), draftClient },
    );
    return { draft: result.draft, ragV2: { trace: result.trace, knowledge: allChunks(result.knowledge).map(({ chunk }) => toDraftKnowledge(chunk)) } };
};

const generateSimulationDraft = async (params: SimulationDraftParams): Promise<SimulationDraftResult> => {
    const { input, normalized, classification, knowledge, from, metrics } = params;
    const crmReader = createPrismaCrmReader();
    // Safe despite referencing `draftClient` inside its own construction call: onMetric is only
    // invoked later, when generateDraft() runs — by then `draftClient` already holds the resolved
    // provider (same pattern as `const timer = setInterval(() => clearInterval(timer), ms)`).
    const draftClient = await createDraftProviderFactory().getSelectedProvider((metric) =>
        metrics.push(buildSimulationRunMetricRow(AiSimulationStage.DRAFT, draftClient.provider as AiDraftProvider, draftClient.model, metric)));
    const crmContact = await crmReader.findContactByEmail(from);
    if (params.useRagV2) {
        const v2 = await generateRagV2SimulationDraft(params, draftClient, crmContact);
        return { ...v2, provider: draftClient.provider as DraftProviderName, model: draftClient.model, crmContact };
    }
    const draft = input.forceDraft && (classification.spam || !classification.needsReply)
        ? emailDraftSchema.parse(await draftClient.generateDraft(await buildDraftContext(normalized, classification, crmReader, knowledge)))
        : await generateEmailDraft(normalized, classification, crmReader, draftClient, knowledge);
    return { draft, provider: draftClient.provider as DraftProviderName, model: draftClient.model, crmContact };
};

export const runEmailAssistantSimulation = async (
    input: EmailSimulationInput,
    deps: { runRepository?: SimulationRunRepository; createdById?: number } = {},
): Promise<EmailSimulationResult> => {
    const runRepository = deps.runRepository ?? createPrismaSimulationRunRepository();
    const metrics: SimulationRunMetricInput[] = [];

    const from = input.from?.trim() || DEFAULT_FROM;
    const raw = { fromAddress: from, subject: input.subject, text: input.body };
    const normalized = normalizeEmail(raw);
    const spamReason = deterministicSpamReason(raw, normalized);

    const { classificationPromptName, draftBodyPromptName } = await resolveSimulationPromptNames(input);
    const classification = await classifyForSimulation(normalized, spamReason, input, metrics);
    // RAG v2 retrieves inside its own draft orchestration (layered, metadata-filtered), so the
    // flat v1 retrieval is skipped; "без знаний" still forces the v1 knowledge-less path.
    const useRagV2 = aiConfig.ragVersion === 'v2' && !input.noKnowledge;
    const { knowledge, queryExpansion } = useRagV2 ? { knowledge: [] as DraftKnowledgeContext[], queryExpansion: null } : await retrieveSimulationKnowledge(normalized, input, metrics);

    const persistRun = buildSimulationRunPersister({
        runRepository, input, spamReason, classification, classificationPromptName, draftBodyPromptName, knowledge, metrics, createdById: deps.createdById,
    });

    if (!classification) {
        const runId = await persistRun({ draftSkippedReason: 'deterministic_spam' });
        return { normalized, deterministicSpamReason: spamReason, classification, knowledge, queryExpansion, crmContact: null, draft: null, draftSkippedReason: 'deterministic_spam', runId, metrics };
    }

    const shouldDraft = input.forceDraft || (!classification.spam && classification.needsReply);
    if (!shouldDraft) {
        const reason = `classification_gate (spam=${classification.spam}, needsReply=${classification.needsReply})`;
        const runId = await persistRun({ draftSkippedReason: reason });
        return { normalized, deterministicSpamReason: spamReason, classification, knowledge, queryExpansion, crmContact: null, draft: null, draftSkippedReason: reason, runId, metrics };
    }

    const { draft, provider, model, crmContact, ragV2 } = await generateSimulationDraft({ input, normalized, classification, knowledge, from, metrics, useRagV2 });
    const usedKnowledge = ragV2?.knowledge ?? knowledge;
    const runId = await persistRun({ draftSkippedReason: null, draftProvider: provider, draftModel: model, draftJson: ragV2 ? { ...draft, ragTrace: ragV2.trace } : draft, knowledge: usedKnowledge });

    return { normalized, deterministicSpamReason: spamReason, classification, knowledge: usedKnowledge, queryExpansion, crmContact, draft, draftSkippedReason: null, runId, metrics, ...(ragV2 ? { ragTrace: ragV2.trace } : {}) };
};
