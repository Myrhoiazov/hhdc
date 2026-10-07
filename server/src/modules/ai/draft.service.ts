import type { AiDraft, Prisma } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { normalizeEmail, type NormalizedEmailInput } from './email-classification';
import type { CrmContactProjection } from './email-draft.types';
import { loadCrmContext } from './crm-context';
import { runEmailAssistant, type EmailAssistantRun } from './email-assistant';
import type { AiSelection } from './registry';

const loadSource = async (conversationId: string, messageId?: string) => {
    const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { person: true, messages: { where: { direction: 'INBOUND', ...(messageId ? { id: messageId } : {}) }, orderBy: { receivedAt: 'desc' }, take: 1 } },
    });
    if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
    const message = conversation.messages[0];
    if (!message) throw new ApiError(400, 'NO_INBOUND_MESSAGE', 'No inbound message to reply to');
    return { conversation, message };
};

type DraftSource = Awaited<ReturnType<typeof loadSource>>;

export const toNormalizedEmail = (message: DraftSource['message'], fallbackSubject: string): NormalizedEmailInput =>
    normalizeEmail({ fromAddress: message.sender, subject: message.subject ?? fallbackSubject, text: message.bodyText, html: message.bodyHtml });

const THREAD_MESSAGES = 6;
const THREAD_MESSAGE_CHARS = 600;

export interface ThreadMessage { direction: string; bodyText: string; createdAt: Date }

// Earlier messages as "[date · who] text", oldest first, each cut to its opening lines.
export const formatThread = (messages: ThreadMessage[]): string => [...messages]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map(message => `[${message.createdAt.toISOString().slice(0, 10)} · ${message.direction === 'OUTBOUND' ? 'HHDC team' : 'customer'}] ${message.bodyText.trim().slice(0, THREAD_MESSAGE_CHARS)}`)
    .join('\n\n');

const loadThread = async (source: DraftSource): Promise<string> => formatThread(await prisma.message.findMany({
    where: { conversationId: source.conversation.id, id: { not: source.message.id }, createdAt: { lt: source.message.createdAt } },
    orderBy: { createdAt: 'desc' }, take: THREAD_MESSAGES, select: { direction: true, bodyText: true, createdAt: true },
}));

// Only what the model needs to address the customer (spec §38: minimum-context principle).
export const toContact = (person: DraftSource['conversation']['person']): CrmContactProjection | null => (person
    ? { id: person.id, email: person.email, firstName: person.firstName || null, lastName: person.lastName || null, status: person.status }
    : null);

// The snapshot keeps the draft auditable after the knowledge base changes (spec §23).
export const buildContextSnapshot = (run: EmailAssistantRun): Prisma.InputJsonObject => JSON.parse(JSON.stringify({
    classification: run.classification,
    rag: run.result?.trace ?? null,
    knowledgeUsed: run.result?.knowledgeRefs ?? [],
    needsStaffReview: run.result?.trace.needsStaffReview ?? true,
    answerability: run.result?.trace.answerability ?? null,
    warnings: run.result?.trace.warnings ?? [],
    promptVersion: run.promptVersion,
}));

export interface DraftAuthor { createdBy: string; actorUserId: string | null }

export const saveDraft = async (source: DraftSource, run: EmailAssistantRun, author: DraftAuthor): Promise<AiDraft> => {
    if (!run.result) throw new ApiError(422, 'DRAFT_NOT_GENERATED', 'The assistant did not produce a draft for this email');
    const { draft, trace } = run.result;
    return prisma.$transaction(async tx => {
        const saved = await tx.aiDraft.create({ data: {
            conversationId: source.conversation.id, sourceMessageId: source.message.id, status: 'GENERATED',
            language: trace.language, intent: trace.intent.toUpperCase(), confidence: draft.confidence,
            model: run.model, promptVersion: run.promptVersion, content: draft.body,
            contextSnapshot: buildContextSnapshot(run), createdBy: author.createdBy,
        } });
        await tx.auditLog.create({ data: { actorUserId: author.actorUserId, action: 'AI_DRAFT_GENERATED', entityType: 'AiDraft', entityId: saved.id } });
        return saved;
    });
};

// What a tester may swap for one draft: the provider/model and the reply-prompt version.
export interface DraftOverrides { ai?: AiSelection; draftPromptId?: string }

export const runAssistantForMessage = async (source: DraftSource, mode: 'advisory' | 'strict', overrides: DraftOverrides = {}): Promise<EmailAssistantRun> =>
    runEmailAssistant({ ...toNormalizedEmail(source.message, source.conversation.subject), thread: await loadThread(source) }, toContact(source.conversation.person), {
        eventId: source.conversation.eventId, mode, ai: overrides.ai, promptIds: { draftBody: overrides.draftPromptId },
        loadCrm: source.conversation.personId ? () => loadCrmContext(source.conversation.personId as string) : undefined,
    });

// A person asked for a draft of the latest incoming message. Without overrides the provider's
// own model answers with the active prompt.
export const generateDraft = async (conversationId: string, userId: string, overrides: DraftOverrides = {}): Promise<AiDraft> => {
    const source = await loadSource(conversationId);
    return saveDraft(source, await runAssistantForMessage(source, 'advisory', overrides), { createdBy: userId, actorUserId: userId });
};

export const loadDraftSource = loadSource;
