import { aiConfig } from '../../config/ai.config';
import { logger } from '../../common/logger';
import { generateEmailDraft, type CrmReader, type DraftKnowledgeContext, type DraftLlmClient, type EmailDraft } from './draft.service';
import { createPrismaAiEmailDraftRepository, DRAFT_PROMPT_VERSION_RAG_V2, persistDraft, type AiEmailDraftRepository, type DraftKnowledgeRefInput } from './draft.persistence';
import prisma from '../../../prisma/prisma-client';
import { notifyDraftForApproval } from './telegram-notification.service';
import type { EmailClassification } from './email-assistant.service';
import { DraftProviderError, type DraftProvider } from './draft-provider';
import { generateRagV2Draft, type RagTrace, type RagV2DraftDeps } from './rag-v2/rag-v2-draft.service';

export interface DraftCandidate {
    id: number;
    sender: string;
    subject: string;
    normalizedBody: string;
    classification: EmailClassification;
}

export interface DraftPipelineRepository extends AiEmailDraftRepository {
    findDraftCandidates(limit: number): Promise<DraftCandidate[]>;
}

export interface DraftKnowledgeProvider {
    retrieve(query: string): Promise<DraftKnowledgeContext[]>;
}

export interface DraftPipelineRunResult {
    processed: number;
    skipped: number;
    failed: number;
}

export interface RunDraftPipelineOptions {
    knowledgeProvider?: DraftKnowledgeProvider;
    // RAG_VERSION=v2: when present, drafts go through the layered v2 pipeline instead of
    // knowledgeProvider (see draft-pipeline.cron.service.ts).
    ragV2?: Omit<RagV2DraftDeps, 'draftClient'>;
    limit?: number;
    notify?: (input: Parameters<typeof notifyDraftForApproval>[0]) => Promise<boolean>;
}

interface ProcessDraftCandidateDeps {
    repository: DraftPipelineRepository;
    crmReader: CrmReader;
    draftClient: DraftLlmClient;
    knowledgeProvider?: DraftKnowledgeProvider;
    ragV2?: Omit<RagV2DraftDeps, 'draftClient'>;
    notify: (input: Parameters<typeof notifyDraftForApproval>[0]) => Promise<boolean>;
}

interface ProducedDraft {
    draft: EmailDraft;
    knowledge: DraftKnowledgeRefInput[];
    sourceLabels: string[];
    ragTrace?: RagTrace;
}

// Records a failure-version draft when the provider itself failed in a recognized way (so the
// admin sees "the model errored" instead of nothing) — never rethrows, the caller always counts
// this candidate as `failed` regardless of whether the failure-version write itself succeeds.
const recordDraftFailure = async (
    candidate: DraftCandidate,
    repository: DraftPipelineRepository,
    draftClient: DraftLlmClient,
    error: unknown,
): Promise<void> => {
    if (repository.createFailureVersion && error instanceof DraftProviderError) {
        const failedDraft = {
            replyLanguage: candidate.classification.language,
            subject: candidate.subject,
            body: '',
            confidence: candidate.classification.confidence,
            needsManualAnswer: true,
            usedKnowledgeIds: [] as string[],
        };
        await repository.createFailureVersion({ emailId: candidate.id, draft: failedDraft, knowledge: [], provider: (draftClient as DraftProvider).provider, model: (draftClient as DraftProvider).model, generationErrorCode: error.code, generationErrorMessage: error.message });
    }
    logger.error(`[AiEmailDraft] Failed email=${candidate.id}: ${error instanceof Error ? error.message : String(error)}`);
};

const toEmailInput = (candidate: DraftCandidate) => ({ fromAddress: candidate.sender, subject: candidate.subject, normalizedBody: candidate.normalizedBody });

const produceV1Draft = async (candidate: DraftCandidate, deps: ProcessDraftCandidateDeps): Promise<ProducedDraft | null> => {
    const knowledge = deps.knowledgeProvider ? await deps.knowledgeProvider.retrieve(`${candidate.subject}\n${candidate.normalizedBody}`) : [];
    const draft = await generateEmailDraft(toEmailInput(candidate), candidate.classification, deps.crmReader, deps.draftClient, knowledge);
    if (!draft) return null;
    return {
        draft,
        knowledge: knowledge.map((item): DraftKnowledgeRefInput => ({ id: item.id, sourceUrl: item.sourceUrl, score: item.score })),
        sourceLabels: knowledge.map((item) => item.sourceUrl),
    };
};

const produceV2Draft = async (candidate: DraftCandidate, deps: ProcessDraftCandidateDeps, ragV2: Omit<RagV2DraftDeps, 'draftClient'>): Promise<ProducedDraft> => {
    const contact = await deps.crmReader.findContactByEmail(candidate.sender);
    const result = await generateRagV2Draft(
        { email: toEmailInput(candidate), classification: candidate.classification, contact, requestId: `email-${candidate.id}` },
        { ...ragV2, draftClient: deps.draftClient },
    );
    return { draft: result.draft, knowledge: result.knowledgeRefs, sourceLabels: Array.from(new Set(result.trace.usedKnowledge.map((item) => item.documentId))), ragTrace: result.trace };
};

const notifyProducedDraft = async (candidate: DraftCandidate, produced: ProducedDraft, saved: { id: number; version: number }, deps: ProcessDraftCandidateDeps): Promise<void> => {
    const contact = await deps.crmReader.findContactByEmail(candidate.sender);
    await deps.notify({
        draftId: saved.id,
        version: saved.version,
        sender: candidate.sender,
        subject: produced.draft.subject,
        body: produced.draft.body,
        language: produced.ragTrace?.language ?? produced.draft.replyLanguage,
        intent: produced.ragTrace ? [produced.ragTrace.intent, produced.ragTrace.subintent].filter(Boolean).join(' / ') : candidate.classification.intent,
        contactName: contact ? [contact.firstName, contact.lastName].filter(Boolean).join(' ') : null,
        knowledgeSourceUrls: produced.ragTrace ? [] : produced.sourceLabels,
        ...(produced.ragTrace ? { sources: produced.sourceLabels, warnings: produced.ragTrace.warnings } : {}),
        needsManualAnswer: produced.draft.needsManualAnswer,
    });
};

const processDraftCandidate = async (
    candidate: DraftCandidate,
    deps: ProcessDraftCandidateDeps,
): Promise<keyof DraftPipelineRunResult> => {
    try {
        if (candidate.classification.spam || !candidate.classification.needsReply) return 'skipped';
        const produced = deps.ragV2 ? await produceV2Draft(candidate, deps, deps.ragV2) : await produceV1Draft(candidate, deps);
        if (!produced) return 'skipped';
        const saved = await persistDraft(deps.repository, {
            emailId: candidate.id,
            draft: produced.draft,
            knowledge: produced.knowledge,
            ...(produced.ragTrace ? { ragTrace: produced.ragTrace as unknown as Record<string, unknown>, promptVersion: DRAFT_PROMPT_VERSION_RAG_V2 } : {}),
        });
        await notifyProducedDraft(candidate, produced, saved, deps);
        return 'processed';
    } catch (error) {
        await recordDraftFailure(candidate, deps.repository, deps.draftClient, error);
        return 'failed';
    }
};

export const runDraftPipeline = async (
    repository: DraftPipelineRepository,
    crmReader: CrmReader,
    draftClient: DraftLlmClient,
    options: RunDraftPipelineOptions = {},
): Promise<DraftPipelineRunResult> => {
    const { knowledgeProvider, ragV2, limit = aiConfig.maxConcurrency, notify = notifyDraftForApproval } = options;
    const result: DraftPipelineRunResult = { processed: 0, skipped: 0, failed: 0 };
    const candidates = await repository.findDraftCandidates(Math.max(1, limit));
    const deps: ProcessDraftCandidateDeps = { repository, crmReader, draftClient, knowledgeProvider, ragV2, notify };
    for (const candidate of candidates) {
        const outcome = await processDraftCandidate(candidate, deps);
        result[outcome] += 1;
    }
    return result;
};

export const createPrismaDraftPipelineRepository = (): DraftPipelineRepository => {
    return {
        ...createPrismaAiEmailDraftRepository(),
        async findDraftCandidates(limit) {
            // `drafts: { none: {} }` alone can't tell "not yet evaluated" apart from "evaluated,
            // a draft is correctly never generated for this one" (spam / !needsReply) — both look
            // identical to that filter, since a skipped email never gets a draft row either. With
            // `take: limit` small (AI_MAX_CONCURRENCY throttles concurrent Ollama calls, default
            // 1) and `orderBy: receivedAt asc`, a single old skip-forever email would occupy that
            // slot on every future run forever, permanently starving any real, newer candidate.
            // Fetching a wider pool and filtering out the permanently-skipped ones here (cheap —
            // no Ollama call yet) before slicing to `limit` fixes the starvation while keeping the
            // actual draft-generation concurrency unchanged.
            const messages = await prisma.aiEmailMessage.findMany({
                where: { status: 'CLASSIFIED', drafts: { none: {} } },
                orderBy: { receivedAt: 'asc' }, take: Math.max(limit, 50),
                select: { id: true, sender: true, subject: true, normalizedBody: true, classifications: { orderBy: { createdAt: 'desc' }, take: 1 } },
            });
            const candidates = messages.flatMap((message) => {
                const classification = message.classifications[0];
                if (!classification) return [];
                if (classification.spam || !classification.needsReply) return [];
                return [{ id: message.id, sender: message.sender, subject: message.subject ?? '', normalizedBody: message.normalizedBody,
                    classification: { spam: classification.spam, needsReply: classification.needsReply, language: classification.language as EmailClassification['language'], intent: classification.intent as EmailClassification['intent'], confidence: classification.confidence, reason: classification.reason } }];
            });
            return candidates.slice(0, limit);
        },
    };
};
