import prisma from '../../../prisma/prisma-client';
import { aiConfig } from '../../config/ai.config';
import {
    emailClassificationSchema,
    type EmailClassification,
} from './email-assistant.service';

export const CLASSIFICATION_PROMPT_VERSION = 'classification-v1';
export const DETERMINISTIC_SPAM_PROMPT_VERSION = 'deterministic-spam-v1';

export interface NormalizedEmailRecord {
    sourceEmailMessageId: number;
    messageId?: string | null;
    threadKey?: string | null;
    sender: string;
    recipients: unknown;
    subject?: string | null;
    normalizedBody: string;
    receivedAt: Date;
}

export interface AiEmailRepository {
    findPendingEmails(limit: number): Promise<PendingAiEmail[]>;
    upsertNormalizedEmail(record: NormalizedEmailRecord): Promise<{ id: number }>;
    upsertClassification(emailId: number, classification: EmailClassification, model: string, promptVersion: string): Promise<void>;
    markFailed(emailId: number): Promise<void>;
}

export interface PendingAiEmail {
    id: number;
    sender: string;
    subject: string;
    normalizedBody: string;
}

const findPendingEmails = (limit: number): Promise<PendingAiEmail[]> => prisma.aiEmailMessage.findMany({
    where: { status: 'NORMALIZED' },
    orderBy: { receivedAt: 'asc' },
    take: limit,
    select: { id: true, sender: true, subject: true, normalizedBody: true },
}).then((messages) => messages.map((message) => ({
    ...message,
    subject: message.subject ?? '',
})));

const upsertNormalizedEmail = (record: NormalizedEmailRecord) => prisma.aiEmailMessage.upsert({
    where: { sourceEmailMessageId: record.sourceEmailMessageId },
    create: {
        sourceEmailMessageId: record.sourceEmailMessageId,
        messageId: record.messageId ?? undefined,
        threadKey: record.threadKey ?? undefined,
        sender: record.sender,
        recipients: record.recipients as object,
        subject: record.subject ?? undefined,
        normalizedBody: record.normalizedBody,
        receivedAt: record.receivedAt,
        status: 'NORMALIZED',
    },
    update: {
        messageId: record.messageId ?? undefined,
        threadKey: record.threadKey ?? undefined,
        sender: record.sender,
        recipients: record.recipients as object,
        subject: record.subject ?? undefined,
        normalizedBody: record.normalizedBody,
        receivedAt: record.receivedAt,
    },
    select: { id: true },
});

const upsertClassification = async (
    emailId: number,
    classification: EmailClassification,
    model: string,
    promptVersion: string,
): Promise<void> => {
    const parsed = emailClassificationSchema.parse(classification);
    await prisma.aiEmailClassification.upsert({
        where: { emailId_promptVersion: { emailId, promptVersion } },
        create: {
            emailId,
            spam: parsed.spam,
            needsReply: parsed.needsReply,
            language: parsed.language,
            intent: parsed.intent,
            confidence: parsed.confidence,
            reason: parsed.reason,
            model,
            promptVersion,
        },
        update: {
            spam: parsed.spam,
            needsReply: parsed.needsReply,
            language: parsed.language,
            intent: parsed.intent,
            confidence: parsed.confidence,
            reason: parsed.reason,
            model,
        },
    });
    await prisma.aiEmailMessage.update({
        where: { id: emailId },
        data: { status: parsed.spam ? 'IGNORED_SPAM' : 'CLASSIFIED' },
    });
};

const markFailed = async (emailId: number): Promise<void> => {
    await prisma.aiEmailMessage.update({ where: { id: emailId }, data: { status: 'FAILED' } });
};

export const createPrismaAiEmailRepository = (): AiEmailRepository => ({
    findPendingEmails,
    upsertNormalizedEmail,
    upsertClassification,
    markFailed,
});

export const persistNormalizedEmail = (
    repository: AiEmailRepository,
    record: NormalizedEmailRecord,
) => repository.upsertNormalizedEmail(record);

export const persistClassification = (
    repository: AiEmailRepository,
    emailId: number,
    classification: EmailClassification,
    options: { model?: string; promptVersion?: string } = {},
) => repository.upsertClassification(
    emailId,
    emailClassificationSchema.parse(classification),
    options.model ?? aiConfig.ollamaModel,
    options.promptVersion ?? CLASSIFICATION_PROMPT_VERSION,
);
