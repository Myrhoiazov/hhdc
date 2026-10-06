import nodemailer from 'nodemailer';
import prisma from '../../../../prisma/prisma-client';
import { decryptEmailSecret } from './email-crypto.service';
import { addressesToJson } from './email-imap.service';
import { storeAttachmentFile } from './email-attachment-storage.service';

interface OutgoingAttachmentInput {
    filename: string;
    mimeType: string;
    buffer: Buffer;
}

interface SendEmailInput {
    to: string[];
    cc?: string[];
    subject: string;
    html: string;
    inReplyToMessageId?: string | null;
    clientId?: number | null;
    attachments?: OutgoingAttachmentInput[];
}

const createTransport = async (accountId: number) => {
    const account = await prisma.emailAccount.findUnique({ where: { id: accountId } });

    if (!account || !account.isActive) {
        throw new Error('Email account not found or inactive');
    }

    const transporter = nodemailer.createTransport({
        host: account.smtpHost,
        port: account.smtpPort,
        secure: account.smtpSecure,
        auth: {
            user: account.username,
            pass: decryptEmailSecret(account.passwordEncrypted),
        },
    });

    return { transporter, account };
};

// A plain-text alternative part is expected by most mail clients/spam filters
// alongside HTML (multipart/alternative) — this is a best-effort conversion,
// not meant to preserve rich formatting, just give non-HTML clients something
// readable.
export const stripHtmlToText = (html: string): string => html
    .replace(/<(br|br\/|br\s*\/)>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const buildEmailHeaders = (input: SendEmailInput): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (input.inReplyToMessageId) {
        headers['In-Reply-To'] = input.inReplyToMessageId;
        headers.References = input.inReplyToMessageId;
    }
    return headers;
};

const persistSentEmail = async (
    account: { id: number; label: string; username: string },
    messageId: string,
    input: SendEmailInput,
    text: string,
) => prisma.emailMessage.create({
    data: {
        mailboxId: account.id,
        messageId,
        inReplyToMessageId: input.inReplyToMessageId ?? undefined,
        isOutgoing: true,
        fromAddress: account.username,
        fromName: account.label,
        toAddresses: addressesToJson(input.to.map((address) => ({ address }))),
        ccAddresses: input.cc?.length ? addressesToJson(input.cc.map((address) => ({ address }))) : undefined,
        subject: input.subject,
        bodyText: text,
        bodyHtml: input.html,
        receivedAt: new Date(),
        isRead: true,
        clientId: input.clientId ?? undefined,
    },
});

const sendEmail = async (accountId: number, input: SendEmailInput) => {
    const { transporter, account } = await createTransport(accountId);

    const headers = buildEmailHeaders(input);

    const text = stripHtmlToText(input.html);

    const info = await transporter.sendMail({
        from: { name: account.label, address: account.username },
        to: input.to,
        cc: input.cc,
        subject: input.subject,
        html: input.html,
        text,
        headers,
        attachments: input.attachments?.map((attachment) => ({
            filename: attachment.filename,
            content: attachment.buffer,
            contentType: attachment.mimeType,
        })),
    });

    const savedMessage = await persistSentEmail(account, info.messageId, input, text);

    if (input.attachments?.length) {
        await Promise.all(input.attachments.map((attachment) => storeAttachmentFile(savedMessage.id, attachment)));
    }

    return savedMessage;
};

const findClientIdByAddress = async (address: string): Promise<number | null> => {
    const client = await prisma.client.findFirst({
        where: { email: address },
        select: { id: true },
    });

    return client?.id ?? null;
};

export const buildReplySubject = (originalSubject?: string | null): string => {
    if (originalSubject?.toLowerCase().startsWith('re:')) {
        return originalSubject;
    }

    return `Re: ${originalSubject ?? ''}`.trim();
};

// Standard mail-client behaviour: answer Reply-To when the sender set one, otherwise From.
export const resolveReplyRecipient = (original: { fromAddress: string; replyToAddress: string | null }): string => (
    original.replyToAddress ?? original.fromAddress
);

export const replyToMessage = async (
    originalMessageDbId: number,
    html: string,
    attachments?: OutgoingAttachmentInput[],
) => {
    const original = await prisma.emailMessage.findUnique({ where: { id: originalMessageDbId } });

    if (!original) {
        throw new Error('Original message not found');
    }

    const subject = buildReplySubject(original.subject);

    // A reply always goes out through the same mailbox that received the original
    // message, not an arbitrary one the caller might pick.
    return sendEmail(original.mailboxId, {
        to: [resolveReplyRecipient(original)],
        subject,
        html,
        inReplyToMessageId: original.messageId,
        clientId: original.clientId,
        attachments,
    });
};

export const composeEmail = async (
    accountId: number,
    input: { to: string[]; cc?: string[]; subject: string; html: string; attachments?: OutgoingAttachmentInput[] },
) => {
    const primaryRecipient = input.to[0];
    const clientId = primaryRecipient ? await findClientIdByAddress(primaryRecipient) : null;

    return sendEmail(accountId, { ...input, clientId });
};
