import { ImapFlow, type FetchMessageObject } from 'imapflow';
import { simpleParser, Attachment as ParsedAttachment } from 'mailparser';
import prisma from '../../../../prisma/prisma-client';
import { logger } from '../../../common/logger';
import { decryptEmailSecret } from './email-crypto.service';
import { storeAttachmentFile } from './email-attachment-storage.service';
import {
    createPrismaAiEmailRepository,
    deterministicSpamReason,
    DETERMINISTIC_SPAM_PROMPT_VERSION,
    normalizeEmail,
    persistClassification,
    persistNormalizedEmail,
} from '../../ai-email-assistant';
import { notifyNewEmail } from '../telegram/telegram.service';

export { ATTACHMENTS_DIR } from './email-attachment-storage.service';

const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024;

interface ImapConnectionConfig {
    imapHost: string;
    imapPort: number;
    imapSecure: boolean;
    username: string;
    password: string;
}

interface SyncResult {
    created: number;
    updated: number;
    skipped: number;
    errors: number;
}

const buildImapClient = (config: ImapConnectionConfig) => new ImapFlow({
    host: config.imapHost,
    port: config.imapPort,
    secure: config.imapSecure,
    auth: {
        user: config.username,
        pass: config.password,
    },
    logger: false,
    // A hung/black-holed host would otherwise sit on the default 90s timeout —
    // with the manual "Sync" button and the 5-minute cron both able to hit the
    // same account, a stuck connection compounds fast if we don't fail sooner.
    connectionTimeout: 20_000,
});

// logout() itself can hang or reject (e.g. the socket already dropped) — letting
// that escape a `finally` would replace whatever real error caused the sync to
// fail in the first place, and the caller would never see it.
const safeLogout = async (client: ImapFlow) => {
    try {
        await client.logout();
    } catch (error) {
        logger.error(`IMAP logout failed (connection likely already closed): ${error}`);
    }
};

// Verifies IMAP credentials work before we save them, so a typo doesn't get
// silently stored and only surface as a confusing failure on next sync.
export const verifyImapConnection = async (config: ImapConnectionConfig) => {
    const client = buildImapClient(config);

    await client.connect();
    await safeLogout(client);
};

export const addressesToJson = (addresses?: { address?: string; name?: string }[] | null) =>
    (addresses ?? [])
        .filter((address) => address.address)
        .map((address) => ({ address: address.address, name: address.name }));

// MySQL's default collation (utf8mb4_unicode_ci) already compares case-insensitively,
// unlike Postgres where Prisma needs an explicit `mode: 'insensitive'` filter option.
//
// `cache` is one Map per sync run (see syncEmailAccountUnguarded) — messages are streamed
// one at a time from the IMAP server (client.fetch is an async iterator, so there's no
// upfront list to batch-query against), but the same sender commonly appears across several
// messages in one sync batch (a thread, or catching up after being offline), so caching
// within a single run avoids repeating the same lookup for every one of their messages.
const findClientIdByAddress = async (
    fromAddress: string,
    cache: Map<string, number | null>,
): Promise<number | null> => {
    const cached = cache.get(fromAddress);
    if (cached !== undefined) {
        return cached;
    }

    const client = await prisma.client.findFirst({
        where: { email: fromAddress },
        select: { id: true },
    });

    const clientId = client?.id ?? null;
    cache.set(fromAddress, clientId);
    return clientId;
};

// `related` attachments are inline images referenced via cid: in the HTML body
// (e.g. a logo in someone's signature) — not files the sender actually attached,
// so we don't want them cluttering the attachments list.
const saveAttachments = async (messageDbId: number, attachments: ParsedAttachment[]) => {
    const realAttachments = attachments.filter((attachment) => !attachment.related);

    await Promise.all(realAttachments.map((attachment) => {
        if (attachment.size > MAX_ATTACHMENT_SIZE) {
            logger.error(`Skipping oversized attachment "${attachment.filename}" (${attachment.size} bytes) for message=${messageDbId}`);
            return undefined;
        }

        return storeAttachmentFile(messageDbId, {
            filename: attachment.filename ?? 'attachment',
            mimeType: attachment.contentType,
            buffer: attachment.content,
        });
    }));
};

// The cron tick (every 5 minutes) and a manual "Sync" click can land on the
// same account at the same time — both would read the same `lastSyncedUid`,
// fetch overlapping ranges, and race to write it back, silently rolling it
// backward. This process runs as a single instance (no horizontal scaling),
// so a plain in-memory guard is enough; a second caller just gets a clear
// "already syncing" error instead of a corrupted cursor.
const accountsCurrentlySyncing = new Set<number>();
const aiEmailRepository = createPrismaAiEmailRepository();

export const syncEmailAccount = async (accountId: number): Promise<SyncResult> => {
    if (accountsCurrentlySyncing.has(accountId)) {
        throw new Error('Этот ящик уже синхронизируется — подождите завершения текущей синхронизации');
    }
    accountsCurrentlySyncing.add(accountId);

    try {
        return await syncEmailAccountUnguarded(accountId);
    } finally {
        accountsCurrentlySyncing.delete(accountId);
    }
};

const connectToAccount = async (accountId: number) => {
    const account = await prisma.emailAccount.findUnique({ where: { id: accountId } });

    if (!account || !account.isActive) {
        throw new Error('Email account not found or inactive');
    }

    const client = buildImapClient({
        imapHost: account.imapHost,
        imapPort: account.imapPort,
        imapSecure: account.imapSecure,
        username: account.username,
        password: decryptEmailSecret(account.passwordEncrypted),
    });

    await client.connect();
    return { account, client };
};

type ParsedEmail = Awaited<ReturnType<typeof simpleParser>> | undefined;
type NormalizedEmail = ReturnType<typeof normalizeEmail>;

const resolveFromAddress = (message: FetchMessageObject, parsed: ParsedEmail): string => (
    message.envelope?.from?.[0]?.address ?? parsed?.from?.value?.[0]?.address ?? ''
);

const normalizeAddress = (address?: string | null): string => (address ?? '').trim().toLowerCase();

// The Reply-To header, only when it names someone other than From. A website contact form is
// sent by the site itself (From: wordpress@…) with the visitor in Reply-To; ordinary mail has no
// Reply-To or repeats From.
export const resolveReplyToAddress = (
    fromAddress: string,
    replyTo?: { address?: string; name?: string }[] | null,
): string | null => {
    const candidate = (replyTo ?? []).map((entry) => normalizeAddress(entry.address)).find((address) => address.includes('@'));
    return candidate && candidate !== normalizeAddress(fromAddress) ? candidate : null;
};

// Who the message is really from, for CRM matching, the AI assistant and replies.
export const resolveContactAddress = (email: { fromAddress: string; replyToAddress: string | null }): string => (
    email.replyToAddress ?? email.fromAddress
);

const readReplyToAddress = (message: FetchMessageObject, parsed: ParsedEmail, fromAddress: string): string | null => (
    resolveReplyToAddress(fromAddress, message.envelope?.replyTo ?? parsed?.replyTo?.value)
);

const upsertEmailMessage = (
    accountId: number,
    message: FetchMessageObject,
    email: { normalized: NormalizedEmail; fromAddress: string; replyToAddress: string | null; parsed: ParsedEmail },
    clientId: number | null,
) => prisma.emailMessage.upsert({
    where: {
        mailboxId_imapUid: {
            mailboxId: accountId,
            imapUid: message.uid,
        },
    },
    create: {
        mailboxId: accountId,
        imapUid: message.uid,
        messageId: message.envelope?.messageId ?? undefined,
        inReplyToMessageId: message.envelope?.inReplyTo ?? undefined,
        fromAddress: email.fromAddress,
        fromName: message.envelope?.from?.[0]?.name ?? undefined,
        replyToAddress: email.replyToAddress ?? undefined,
        toAddresses: addressesToJson(message.envelope?.to),
        ccAddresses: addressesToJson(message.envelope?.cc),
        subject: email.normalized.subject || undefined,
        bodyText: email.normalized.normalizedBody || undefined,
        bodyHtml: typeof email.parsed?.html === 'string' ? email.parsed.html : undefined,
        receivedAt: message.envelope?.date ?? new Date(),
        clientId: clientId ?? undefined,
    },
    update: {},
});

const classifyAndPersistSpamIfDetected = async (
    aiMessageId: number,
    fromAddress: string,
    normalized: NormalizedEmail,
    parsed: ParsedEmail,
): Promise<string | null> => {
    const spamReason = deterministicSpamReason({
        fromAddress,
        subject: normalized.subject,
        text: parsed?.text,
        html: typeof parsed?.html === 'string' ? parsed.html : undefined,
        headers: parsed?.headers,
    }, normalized);

    if (spamReason) {
        await persistClassification(aiEmailRepository, aiMessageId, {
            spam: true,
            needsReply: false,
            language: 'unknown',
            intent: 'other',
            confidence: 1,
            reason: spamReason,
        }, {
            model: 'deterministic',
            promptVersion: DETERMINISTIC_SPAM_PROMPT_VERSION,
        });
    }
    return spamReason;
};

// Fire-and-forget — a Telegram outage must never fail the sync itself.
const notifyIfNotSpam = (
    message: FetchMessageObject,
    email: { fromAddress: string; replyToAddress: string | null; subject: string },
    accountLabel: string,
    outcome: { spamReason: string | null; savedMessageId: number },
): void => {
    if (outcome.spamReason) return;
    void notifyNewEmail({
        fromAddress: email.fromAddress,
        fromName: message.envelope?.from?.[0]?.name,
        replyToAddress: email.replyToAddress,
        subject: email.subject,
        accountLabel,
    }).catch((error) => logger.error(`Failed to send new-email Telegram notification for message=${outcome.savedMessageId}: ${error}`));
};

const processMessage = async (
    message: FetchMessageObject,
    accountId: number,
    accountLabel: string,
    startUid: number,
    clientIdCache: Map<string, number | null>,
): Promise<{ created: boolean; uid: number } | null> => {
    if (message.uid < startUid) return null;

    const parsed = message.source ? await simpleParser(message.source) : undefined;
    const fromAddress = resolveFromAddress(message, parsed);
    if (!fromAddress) return { created: false, uid: message.uid };

    const normalized = normalizeEmail({
        fromAddress,
        subject: message.envelope?.subject ?? parsed?.subject,
        text: parsed?.text,
        html: typeof parsed?.html === 'string' ? parsed.html : undefined,
        headers: parsed?.headers,
    });

    const replyToAddress = readReplyToAddress(message, parsed, fromAddress);
    const contactAddress = resolveContactAddress({ fromAddress: normalized.fromAddress, replyToAddress });
    const clientId = await findClientIdByAddress(contactAddress, clientIdCache);
    const savedMessage = await upsertEmailMessage(accountId, message, { normalized, fromAddress, replyToAddress, parsed }, clientId);

    const aiMessage = await persistNormalizedEmail(aiEmailRepository, {
        sourceEmailMessageId: savedMessage.id,
        messageId: message.envelope?.messageId,
        threadKey: message.envelope?.inReplyTo ?? message.envelope?.messageId,
        sender: contactAddress,
        recipients: addressesToJson(message.envelope?.to),
        subject: normalized.subject || null,
        normalizedBody: normalized.normalizedBody,
        receivedAt: message.envelope?.date ?? new Date(),
    });

    const spamReason = await classifyAndPersistSpamIfDetected(aiMessage.id, fromAddress, normalized, parsed);

    if (parsed?.attachments?.length) {
        await saveAttachments(savedMessage.id, parsed.attachments);
    }

    notifyIfNotSpam(message, { fromAddress, replyToAddress, subject: normalized.subject }, accountLabel, { spamReason, savedMessageId: savedMessage.id });

    return { created: true, uid: message.uid };
};

const syncEmailAccountUnguarded = async (accountId: number): Promise<SyncResult> => {
    const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: 0 };
    const { account, client } = await connectToAccount(accountId);

    try {
        const mailbox = await client.mailboxOpen('INBOX');
        const startUid = (account.lastSyncedUid ?? 0) + 1;

        if (mailbox.uidNext <= startUid) {
            return result;
        }

        let highestUid = account.lastSyncedUid ?? 0;
        const clientIdCache = new Map<string, number | null>();

        for await (const message of client.fetch(
            `${startUid}:*`,
            { envelope: true, source: true },
            { uid: true },
        )) {
            try {
                const outcome = await processMessage(message, account.id, account.label, startUid, clientIdCache);

                if (!outcome) continue; // already synced

                if (outcome.created) {
                    result.created += 1;
                } else {
                    result.skipped += 1;
                }

                highestUid = Math.max(highestUid, outcome.uid);
            } catch (error) {
                logger.error(`Failed to sync email uid=${message.uid} for account=${account.id}: ${error}`);
                result.errors += 1;
            }
        }

        await prisma.emailAccount.update({
            where: { id: account.id },
            data: { lastSyncedUid: highestUid, lastSyncedAt: new Date() },
        });
    } finally {
        await safeLogout(client);
    }

    return result;
};

// Used for both "delete" (move to the account's trash folder) and "mark as
// spam" (move to the account's spam folder) — IMAP MOVE (with imapflow's
// automatic COPY+EXPUNGE fallback for servers that don't support the MOVE
// extension) rather than an outright \Deleted+expunge, so a message the user
// removes by mistake is still recoverable from the mailbox's own Trash/Junk
// folder via any regular mail client.
export const moveMessageOnServer = async (accountId: number, imapUid: number, destinationFolder: string) => {
    const { client } = await connectToAccount(accountId);

    try {
        await client.mailboxOpen('INBOX');
        const result = await client.messageMove([imapUid], destinationFolder, { uid: true });

        if (!result) {
            throw new Error(`IMAP server rejected moving uid=${imapUid} to "${destinationFolder}" (does that folder exist?)`);
        }
    } finally {
        await safeLogout(client);
    }
};
