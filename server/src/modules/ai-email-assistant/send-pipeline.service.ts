import { aiConfig } from '../../config/ai.config';
import { logger } from '../../common/logger';

export interface SendCandidate {
    draftId: number;
    version: number;
    body: string;
    sourceEmailMessageId: number;
}

export interface SendPipelineRepository {
    findApprovedCandidates(limit: number): Promise<SendCandidate[]>;
    claimForSending(draftId: number, version: number, idempotencyKey: string): Promise<boolean>;
    markSent(draftId: number, version: number, sentEmailMessageId: number, sentAt: Date): Promise<void>;
    markFailed(draftId: number, version: number, error: string): Promise<void>;
}

export interface EmailSender {
    replyToMessage(sourceEmailMessageId: number, html: string): Promise<{ id: number }>;
}

export interface SendPipelineRunResult {
    processed: number;
    skipped: number;
    failed: number;
}

// The approved draft body is plain text (see draft.service.ts's emailDraftSchema); this is a
// minimal, safe plain-text-to-HTML conversion, not a rich-formatting renderer.
const escapeHtml = (value: string): string => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const draftBodyToHtml = (body: string): string => `<p>${escapeHtml(body).replace(/\n/g, '<br>')}</p>`;

// Deterministic per (draft, version) so a retried or duplicate cron tick can never mint a second
// key for content that was already claimed/sent.
export const buildSendIdempotencyKey = (draftId: number, version: number): string => `ai-draft-${draftId}-v${version}`;

export const runSendPipeline = async (
    repository: SendPipelineRepository,
    sender: EmailSender,
    limit = aiConfig.maxConcurrency,
): Promise<SendPipelineRunResult> => {
    const result: SendPipelineRunResult = { processed: 0, skipped: 0, failed: 0 };
    const candidates = await repository.findApprovedCandidates(Math.max(1, limit));
    for (const candidate of candidates) {
        const idempotencyKey = buildSendIdempotencyKey(candidate.draftId, candidate.version);
        // Atomically flips APPROVED -> SENDING guarded by (id, version, status); a concurrent
        // worker or a retry of this same tick sees the row is no longer APPROVED and skips it,
        // so a draft is never sent twice.
        const claimed = await repository.claimForSending(candidate.draftId, candidate.version, idempotencyKey);
        if (!claimed) {
            result.skipped += 1;
            continue;
        }
        try {
            const sent = await sender.replyToMessage(candidate.sourceEmailMessageId, draftBodyToHtml(candidate.body));
            await repository.markSent(candidate.draftId, candidate.version, sent.id, new Date());
            result.processed += 1;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await repository.markFailed(candidate.draftId, candidate.version, message);
            result.failed += 1;
            logger.error(`[AiEmailSend] Failed draft=${candidate.draftId} v${candidate.version}: ${message}`);
        }
    }
    return result;
};
