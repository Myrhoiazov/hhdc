import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import type { EmailAttachment, SendEmailInput } from '../../integrations/email/EmailProvider';
import { ApiError } from '../../common/http';
import { attachmentSummary } from './attachments';
import { resolveContact } from './ingest';
import { emailProvider } from './send';

export const composeSchema = z.object({
    providerConnectionId: z.string().uuid(),
    recipient: z.string().trim().toLowerCase().email().max(320),
    // A line break in a header would let the subject smuggle in extra headers.
    subject: z.string().trim().min(1).max(300).regex(/^[^\r\n]*$/, 'Subject must be a single line'),
    content: z.string().trim().min(1).max(20000),
}).strict();
export type ComposeEmail = z.infer<typeof composeSchema>;

interface Mailbox {
    sender: string;
    send(input: SendEmailInput): Promise<{ externalId: string; threadId?: string }>;
}

export interface SentEmail extends ComposeEmail { sender: string; externalId: string; threadId: string; attachments: EmailAttachment[] }

export interface ComposeEmailDeps {
    openMailbox(providerConnectionId: string): Promise<Mailbox>;
    record(email: SentEmail, userId: string): Promise<{ id: string }>;
    newMessageId(): string;
}

// Starts a new conversation with a letter written in the CRM; nothing is stored unless the
// mailbox provider accepted the message.
export interface ComposeEmailOptions { attachments?: EmailAttachment[]; deps?: ComposeEmailDeps }

export const composeEmail = async (input: ComposeEmail, userId: string, options: ComposeEmailOptions = {}) => {
    const { attachments = [], deps = productionDeps } = options;
    const mailbox = await deps.openMailbox(input.providerConnectionId);
    const messageId = deps.newMessageId();
    let sent: { externalId: string; threadId?: string };
    try {
        sent = await mailbox.send({ sender: mailbox.sender, recipient: input.recipient, subject: input.subject, content: input.content, messageId,
            ...(attachments.length ? { attachments } : {}) });
    } catch {
        throw new ApiError(502, 'EMAIL_SEND_UNCONFIRMED', 'Provider did not confirm delivery; check the mailbox before retrying');
    }
    // IMAP threads by the root of the References chain, which for the replies is this message.
    return deps.record({ ...input, sender: mailbox.sender, externalId: sent.externalId, threadId: sent.threadId ?? messageId, attachments }, userId);
};

const openMailbox: ComposeEmailDeps['openMailbox'] = async providerConnectionId => {
    const { connection, provider } = await emailProvider(providerConnectionId);
    const { sender } = z.object({ sender: z.string().email() }).parse(connection.settings);
    return { sender, send: input => provider.sendMessage(input) };
};

const record: ComposeEmailDeps['record'] = (email, userId) => prisma.$transaction(async tx => {
    const now = new Date();
    const personId = await resolveContact(tx, email.providerConnectionId, email.recipient);
    const conversation = await tx.conversation.create({ data: { subject: email.subject, personId, status: 'WAITING', lastMessageAt: now } });
    await tx.externalIdentity.create({ data: { providerConnectionId: email.providerConnectionId, entityType: 'EMAIL_THREAD', entityId: conversation.id, externalId: email.threadId } });
    const message = await tx.message.create({ data: {
        conversationId: conversation.id, providerConnectionId: email.providerConnectionId, direction: 'OUTBOUND',
        sender: email.sender, recipient: email.recipient, subject: email.subject, bodyText: email.content,
        externalId: email.externalId, sentAt: now, isRead: true,
        rawData: { attachments: attachmentSummary(email.attachments) },
    } });
    await tx.activity.create({ data: { personId, actorUserId: userId, type: 'EMAIL_SENT', entityType: 'Message', entityId: message.id, metadata: {} } });
    await tx.auditLog.create({ data: { actorUserId: userId, action: 'EMAIL_SENT', entityType: 'Message', entityId: message.id } });
    return { id: conversation.id };
});

const productionDeps: ComposeEmailDeps = { openMailbox, record, newMessageId: () => `<${randomUUID()}@hhdc-crm.local>` };
