import { simpleParser, type AddressObject, type ParsedMail } from 'mailparser';
import { z } from 'zod';
import type { NormalizedEmail } from '../EmailProvider';

export interface RawImapMessage {
    uid: number;
    uidValidity: string;
    source: Buffer;
    internalDate?: Date;
    // IMAP flags of the message; \Seen means the mailbox considers it read.
    flags?: readonly string[];
}

const emailAddress = z.string().trim().toLowerCase().email();

const firstAddress = (field?: AddressObject | AddressObject[]): string | undefined => {
    const first = Array.isArray(field) ? field[0] : field;
    const parsed = emailAddress.safeParse(first?.value[0]?.address);
    return parsed.success ? parsed.data : undefined;
};

const referenceIds = (references?: string | string[]): string[] =>
    (Array.isArray(references) ? references : (references ?? '').split(/\s+/)).filter(Boolean);

// IMAP has no thread identifier: the root of the References chain names the thread, so a
// reply to one of our own outgoing messages still lands in the conversation it belongs to.
export const threadKey = (parsed: Pick<ParsedMail, 'references' | 'inReplyTo' | 'messageId'>, fallback: string): string =>
    referenceIds(parsed.references)[0] ?? parsed.inReplyTo ?? parsed.messageId ?? fallback;

const distinctReplyTo = (parsed: ParsedMail, sender: string): string | undefined => {
    const replyTo = firstAddress(parsed.replyTo);
    return replyTo && replyTo !== sender ? replyTo : undefined;
};

// Returns null when the message has no usable sender; the caller counts it as skipped.
export const normalizeImapMessage = async (message: RawImapMessage, mailboxAddress: string): Promise<NormalizedEmail | null> => {
    const parsed = await simpleParser(message.source);
    const sender = firstAddress(parsed.from);
    if (!sender) return null;
    const uidKey = `imap:${message.uidValidity}:${message.uid}`;
    return {
        // Message-ID survives a UIDVALIDITY reset, so re-reading the mailbox does not duplicate mail.
        externalId: parsed.messageId ?? uidKey,
        threadId: threadKey(parsed, uidKey),
        sender,
        recipient: firstAddress(parsed.to) ?? mailboxAddress.toLowerCase(),
        subject: parsed.subject ?? '(No subject)',
        bodyText: parsed.text ?? '',
        bodyHtml: typeof parsed.html === 'string' ? parsed.html : undefined,
        receivedAt: parsed.date ?? message.internalDate ?? new Date(),
        messageId: parsed.messageId,
        replyTo: distinctReplyTo(parsed, sender),
        providerRef: `${message.uidValidity}:${message.uid}`,
        isRead: (message.flags ?? []).includes('\\Seen'),
    };
};

export interface ImapCursor { uidValidity: string; lastUid: number }
export interface ImapMailboxState { uidValidity: string; uidNext: number; exists: number }
// `byUid: false` addresses messages by their position in the mailbox (sequence number).
export interface ImapFetchRange { from: number; byUid: boolean }

const CURSOR_PREFIX = 'v2:';

// Cursors written before v2 measured the first window in UIDs and could miss most of the
// mailbox. They are ignored, so the next run re-reads the window; ingestion deduplicates.
export const parseImapCursor = (cursor?: string): ImapCursor | undefined => {
    const match = /^v2:(\d+):(\d+)$/.exec(cursor ?? '');
    return match ? { uidValidity: match[1], lastUid: Number(match[2]) } : undefined;
};

export const formatImapCursor = (cursor: ImapCursor): string => `${CURSOR_PREFIX}${cursor.uidValidity}:${cursor.lastUid}`;

// Later syncs continue after the cursor. The first sync (or a mailbox whose UIDs were reset)
// takes the newest `initialWindow` messages by position: UIDs are sparse, so a UID distance
// says nothing about how many messages it covers.
export const rangeToFetch = (cursor: ImapCursor | undefined, mailbox: ImapMailboxState, initialWindow: number): ImapFetchRange =>
    (cursor && cursor.uidValidity === mailbox.uidValidity
        ? { from: cursor.lastUid + 1, byUid: true }
        : { from: Math.max(1, mailbox.exists - initialWindow + 1), byUid: false });

export const rangeHasMessages = (range: ImapFetchRange, mailbox: ImapMailboxState): boolean =>
    (range.byUid ? mailbox.uidNext > range.from : mailbox.exists >= range.from);
