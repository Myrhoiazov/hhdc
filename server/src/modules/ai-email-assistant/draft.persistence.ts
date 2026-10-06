import { AiEmailDraftStatus, Prisma } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { aiConfig } from '../../config/ai.config';
import { emailDraftSchema, type EmailDraft } from './draft.service';
import type { DraftApprovalRepository } from './approval.service';
import { DRAFT_PROVIDERS, type DraftProviderName } from './draft-provider';

export const DRAFT_PROMPT_VERSION = 'draft-v1';
export const DRAFT_PROMPT_VERSION_RAG_V2 = 'draft-rag-v2';

export interface DraftKnowledgeRefInput {
    id: string;
    sourceUrl: string;
    score: number;
}

export interface DraftRecord {
    emailId: number;
    draft: EmailDraft;
    knowledge: DraftKnowledgeRefInput[];
    model?: string;
    promptVersion?: string;
    provider?: DraftProviderName;
    generationErrorCode?: string;
    generationErrorMessage?: string;
    status?: AiEmailDraftStatus;
    // RAG v2 diagnostics (intent, plan, used knowledge, warnings, confidence level) — no raw
    // chunk text or customer message is stored here.
    ragTrace?: Record<string, unknown>;
}

export interface AiEmailDraftRepository {
    createNextVersion(record: DraftRecord): Promise<{ id: number; version: number }>;
    createFailureVersion?(record: DraftRecord): Promise<{ id: number; version: number }>;
}

const createNextDraftVersion: AiEmailDraftRepository['createNextVersion'] = async (record) => {
    const parsed = emailDraftSchema.parse(record.draft);
    return prisma.$transaction(async (transaction) => {
        const latest = await transaction.aiEmailDraft.findFirst({
            where: { emailId: record.emailId },
            orderBy: { version: 'desc' },
            select: { version: true },
        });
        const version = (latest?.version ?? 0) + 1;
        const created = await transaction.aiEmailDraft.create({
            data: {
                emailId: record.emailId,
                version,
                subject: parsed.subject,
                body: parsed.body,
                replyLanguage: parsed.replyLanguage,
                confidence: parsed.confidence,
                needsManualAnswer: parsed.needsManualAnswer,
                provider: record.provider ?? DRAFT_PROVIDERS.OLLAMA,
                model: record.model ?? aiConfig.ollamaModel,
                promptVersion: record.promptVersion ?? DRAFT_PROMPT_VERSION,
                status: record.status ?? AiEmailDraftStatus.GENERATED,
                generationErrorCode: record.generationErrorCode,
                generationErrorMessage: record.generationErrorMessage?.slice(0, 500),
                ...(record.ragTrace ? { ragTrace: record.ragTrace as Prisma.InputJsonValue } : {}),
                knowledgeRefs: {
                    create: record.knowledge.slice(0, 20).map((ref) => ({
                        knowledgeId: ref.id,
                        sourceUrl: ref.sourceUrl,
                        score: ref.score,
                    })),
                },
            },
            select: { id: true, version: true },
        });
        return created;
    });
};

const createFailureDraftVersion: NonNullable<AiEmailDraftRepository['createFailureVersion']> = async (record) => {
    const latest = await prisma.aiEmailDraft.findFirst({ where: { emailId: record.emailId }, orderBy: { version: 'desc' }, select: { version: true } });
    return prisma.aiEmailDraft.create({
        data: {
            emailId: record.emailId,
            version: (latest?.version ?? 0) + 1,
            subject: record.draft.subject,
            body: record.draft.body,
            replyLanguage: record.draft.replyLanguage,
            confidence: record.draft.confidence,
            needsManualAnswer: true,
            provider: record.provider ?? DRAFT_PROVIDERS.OLLAMA,
            model: record.model ?? aiConfig.ollamaModel,
            promptVersion: record.promptVersion ?? DRAFT_PROMPT_VERSION,
            status: AiEmailDraftStatus.FAILED,
            generationErrorCode: record.generationErrorCode,
            generationErrorMessage: record.generationErrorMessage?.slice(0, 500),
        },
        select: { id: true, version: true },
    });
};

export const createPrismaAiEmailDraftRepository = (): AiEmailDraftRepository => ({
    createNextVersion: createNextDraftVersion,
    createFailureVersion: createFailureDraftVersion,
});

export const persistDraft = (
    repository: AiEmailDraftRepository,
    record: DraftRecord,
) => repository.createNextVersion({
    ...record,
    draft: emailDraftSchema.parse(record.draft),
});

export const createPrismaDraftApprovalRepository = (): DraftApprovalRepository => ({
    async findDraftVersion(draftId, version) {
        return prisma.aiEmailDraft.findUnique({
            where: { id: draftId },
            select: { id: true, version: true, status: true },
        }).then((draft) => draft && draft.version === version ? draft : null) as Promise<Awaited<ReturnType<DraftApprovalRepository['findDraftVersion']>>>;
    },

    async transitionDraft(draftId, version, status, editedBody) {
        await prisma.aiEmailDraft.updateMany({
            where: { id: draftId, version, status: { in: ['GENERATED', 'EDITED'] } },
            data: { status, ...(editedBody ? { body: editedBody } : {}) },
        });
    },

    async recordApproval(input) {
        await prisma.aiEmailApproval.create({
            data: {
                draftId: input.draftId,
                draftVersion: input.draftVersion,
                action: input.action,
                actorId: input.actorId,
                editedBody: input.editedBody,
            },
        });
    },
});
