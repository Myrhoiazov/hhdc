import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { logger } from '../../common/logger';
import { loadDraftSource, runAssistantForMessage, saveDraft } from './draft.service';

const FRESH_MAIL_MS = 24 * 60 * 60_000;
const ACTIONABLE_DRAFTS = ['GENERATED', 'EDITED', 'APPROVED', 'SENDING'] as const;

export interface InboundCandidate { direction: string; receivedAt: Date | null; classification: unknown; hasDraft: boolean }

// Why an incoming message is left to people, or null when the assistant should prepare a draft.
// Imported history and messages handled before (a retried event) are never drafted again.
export const skipReason = (candidate: InboundCandidate | null, now: number, enabled: boolean): string | null => {
    if (!enabled) return 'disabled';
    if (!candidate || candidate.direction !== 'INBOUND') return 'not_inbound';
    if (!candidate.receivedAt || now - candidate.receivedAt.getTime() > FRESH_MAIL_MS) return 'not_fresh';
    if (candidate.classification !== null && candidate.classification !== undefined) return 'already_classified';
    return candidate.hasDraft ? 'draft_exists' : null;
};

const loadCandidate = async (messageId: string) => {
    const message = await prisma.message.findUnique({ where: { id: messageId }, select: { conversationId: true, direction: true, receivedAt: true, classification: true } });
    if (!message) return null;
    const drafts = await prisma.aiDraft.count({ where: { conversationId: message.conversationId, status: { in: [...ACTIONABLE_DRAFTS] } } });
    return { ...message, hasDraft: drafts > 0 };
};

// Off unless both switches are on: background drafting calls the model for every new email.
export const autoDraftEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
    env.AI_EMAIL_CLASSIFICATION_ENABLED === 'true' && env.AI_EMAIL_DRAFT_ENABLED === 'true';

// Classifies a new incoming email and, when it needs an answer, prepares a draft that waits in
// the CRM for a person to approve. Nothing is ever sent from here (spec §71).
export const prepareInboundDraft = async (messageId: string, now = Date.now()): Promise<string> => {
    const candidate = await loadCandidate(messageId);
    const reason = skipReason(candidate, now, autoDraftEnabled());
    if (reason || !candidate) return reason ?? 'not_inbound';
    const source = await loadDraftSource(candidate.conversationId, messageId);
    const run = await runAssistantForMessage(source, 'strict');
    await prisma.message.update({ where: { id: messageId }, data: { classification: { ...run.classification } } });
    if (!run.result) return run.classification.spam ? 'spam' : 'no_reply_needed';
    await saveDraft(source, run, { createdBy: 'SYSTEM', actorUserId: null });
    return 'drafted';
};

// Fire-and-forget entry for the outbox worker: a slow or failing model must never hold up mail.
export const prepareInboundDraftSafely = (payload: Record<string, unknown>): void => {
    if (typeof payload.entityId !== 'string') return;
    void prepareInboundDraft(payload.entityId).catch(error => {
        // No AI provider connected is a normal state, not an incident.
        if (error instanceof ApiError && error.status === 503) return;
        logger.warn(`[ai-email] draft preparation failed: ${error instanceof Error ? error.message.slice(0, 200) : 'unknown error'}`);
    });
};
