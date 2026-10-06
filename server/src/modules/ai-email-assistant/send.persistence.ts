import prisma from '../../../prisma/prisma-client';
import { replyToMessage } from '../communication/email/email-smtp.service';
import type { EmailSender, SendCandidate, SendPipelineRepository } from './send-pipeline.service';

export const createPrismaSendPipelineRepository = (): SendPipelineRepository => ({
    async findApprovedCandidates(limit): Promise<SendCandidate[]> {
        const drafts = await prisma.aiEmailDraft.findMany({
            where: { status: 'APPROVED' },
            orderBy: { updatedAt: 'asc' },
            take: limit,
            select: { id: true, version: true, body: true, email: { select: { sourceEmailMessageId: true } } },
        });
        return drafts.flatMap((draft) => (draft.email.sourceEmailMessageId === null ? [] : [{
            draftId: draft.id,
            version: draft.version,
            body: draft.body,
            sourceEmailMessageId: draft.email.sourceEmailMessageId,
        }]));
    },

    async claimForSending(draftId, version, idempotencyKey) {
        const claimed = await prisma.aiEmailDraft.updateMany({
            where: { id: draftId, version, status: 'APPROVED' },
            data: { status: 'SENDING', sendIdempotencyKey: idempotencyKey, sendAttempts: { increment: 1 } },
        });
        return claimed.count === 1;
    },

    async markSent(draftId, version, sentEmailMessageId, sentAt) {
        await prisma.aiEmailDraft.updateMany({
            where: { id: draftId, version, status: 'SENDING' },
            data: { status: 'SENT', sentEmailMessageId, sentAt },
        });
    },

    async markFailed(draftId, version, error) {
        await prisma.aiEmailDraft.updateMany({
            where: { id: draftId, version, status: 'SENDING' },
            data: { status: 'FAILED', sendError: error.slice(0, 500) },
        });
    },
});

export const createEmailSmtpSender = (): EmailSender => ({
    async replyToMessage(sourceEmailMessageId, html) {
        const sent = await replyToMessage(sourceEmailMessageId, html);
        return { id: sent.id };
    },
});
