import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import type { EmailAttachment, EmailDisposition, EmailProvider, EmailSyncPage, NormalizedEmail, RemoteEmailRef, SendEmailInput } from '../EmailProvider';
import {
    formatImapCursor, normalizeImapMessage, parseImapCursor, rangeHasMessages, rangeToFetch,
    type ImapFetchRange, type ImapMailboxState, type RawImapMessage,
} from './normalize';

// How many of the newest messages the first sync of a mailbox imports.
const INITIAL_SYNC_WINDOW = 200;
const CONNECTION_TIMEOUT_MS = 20_000;

const port = z.coerce.number().int().min(1).max(65535);
export const imapConfigSchema = z.object({
    credentials: z.object({ username: z.string().min(1), password: z.string().min(1) }),
    settings: z.object({
        imapHost: z.string().min(1), imapPort: port.default(993), imapSecure: z.boolean().default(true),
        smtpHost: z.string().min(1), smtpPort: port.default(465), smtpSecure: z.boolean().default(true),
    }),
});
export type ImapConfig = z.infer<typeof imapConfigSchema>;

export interface MailboxSnapshot extends ImapMailboxState { messages: RawImapMessage[] }
export interface OutgoingMail { from: string | { name: string; address: string }; to: string; subject: string; text: string; html?: string; inReplyTo?: string; references?: string; messageId?: string; attachments?: EmailAttachment[] }
export interface ImapMoveRequest { messages: RemoteEmailRef[]; disposition: EmailDisposition }
export interface ImapMarkReadRequest { messages: RemoteEmailRef[] }

// The network seams of the adapter; tests replace them with in-memory fakes.
export interface ImapTransports {
    verify(config: ImapConfig): Promise<void>;
    readInbox(config: ImapConfig, selectRange: (mailbox: ImapMailboxState) => ImapFetchRange): Promise<MailboxSnapshot>;
    send(config: ImapConfig, mail: OutgoingMail): Promise<{ messageId: string }>;
    move(config: ImapConfig, request: ImapMoveRequest): Promise<void>;
    markRead(config: ImapConfig, request: ImapMarkReadRequest): Promise<void>;
}

const imapClient = (config: ImapConfig) => new ImapFlow({
    host: config.settings.imapHost, port: config.settings.imapPort, secure: config.settings.imapSecure,
    auth: { user: config.credentials.username, pass: config.credentials.password },
    logger: false,
    // A black-holed host would otherwise hold the sync for the 90s default.
    connectionTimeout: CONNECTION_TIMEOUT_MS,
});

const smtpTransport = (config: ImapConfig) => nodemailer.createTransport({
    host: config.settings.smtpHost, port: config.settings.smtpPort, secure: config.settings.smtpSecure,
    auth: { user: config.credentials.username, pass: config.credentials.password },
    connectionTimeout: CONNECTION_TIMEOUT_MS,
});

// logout() can reject once the socket is gone; that must not replace the real sync error.
const safeLogout = async (client: ImapFlow) => {
    try { await client.logout(); } catch { /* connection already closed */ }
};

const withInbox = async <T>(config: ImapConfig, work: (client: ImapFlow, mailbox: ImapMailboxState) => Promise<T>): Promise<T> => {
    const client = imapClient(config);
    await client.connect();
    try {
        const mailbox = await client.mailboxOpen('INBOX', { readOnly: true });
        return await work(client, { uidValidity: String(mailbox.uidValidity), uidNext: mailbox.uidNext, exists: mailbox.exists });
    } finally {
        await safeLogout(client);
    }
};

const fetchRange = async (client: ImapFlow, range: ImapFetchRange, uidValidity: string): Promise<RawImapMessage[]> => {
    const messages: RawImapMessage[] = [];
    for await (const message of client.fetch(`${range.from}:*`, { uid: true, source: true, internalDate: true, flags: true }, { uid: range.byUid })) {
        // `N:*` always returns the newest message, even when its UID is below N.
        if ((range.byUid && message.uid < range.from) || !message.source) continue;
        const internalDate = message.internalDate ? new Date(message.internalDate) : undefined;
        messages.push({ uid: message.uid, uidValidity, source: message.source, internalDate, flags: [...message.flags] });
    }
    return messages;
};

const verifyTransports = async (config: ImapConfig) => {
    await withInbox(config, async (): Promise<void> => undefined);
    await smtpTransport(config).verify();
};

const readInbox: ImapTransports['readInbox'] = (config, selectRange) => withInbox(config, async (client, mailbox) => {
    const range = selectRange(mailbox);
    const messages = rangeHasMessages(range, mailbox) ? await fetchRange(client, range, mailbox.uidValidity) : [];
    return { ...mailbox, messages };
});

const sendMail: ImapTransports['send'] = async (config, mail) => {
    const info = await smtpTransport(config).sendMail(mail);
    return { messageId: z.string().min(1).parse(info.messageId) };
};

const destinationMailbox = async (client: ImapFlow, disposition: EmailDisposition) => {
    const specialUse = disposition === 'SPAM' ? '\\Junk' : '\\Trash';
    const mailbox = (await client.list()).find(item => item.specialUse === specialUse);
    if (!mailbox) throw new Error(`Mailbox does not provide ${specialUse}`);
    return mailbox.path;
};

const uidFromRef = (providerRef: string | undefined, uidValidity: string): number | undefined => {
    const match = /^(\d+):(\d+)$/.exec(providerRef ?? '');
    return match?.[1] === uidValidity ? Number(match[2]) : undefined;
};

const resolveMessageUid = async (client: ImapFlow, message: RemoteEmailRef, uidValidity: string) => {
    const knownUid = uidFromRef(message.providerRef, uidValidity);
    if (knownUid) return knownUid;
    const matches = await client.search({ header: { 'message-id': message.externalId } }, { uid: true });
    return matches && matches[0];
};

const resolveUids = async (client: ImapFlow, messages: RemoteEmailRef[], uidValidity: string): Promise<number[]> => {
    const uids = await Promise.all(messages.map(message => resolveMessageUid(client, message, uidValidity)));
    return uids.filter((uid): uid is number => Boolean(uid));
};

const moveMessages: ImapTransports['move'] = async (config, request) => {
    const client = imapClient(config);
    await client.connect();
    try {
        const destination = await destinationMailbox(client, request.disposition);
        const mailbox = await client.mailboxOpen('INBOX');
        const uids = await resolveUids(client, request.messages, String(mailbox.uidValidity));
        if (uids.length) await client.messageMove([...new Set(uids)], destination, { uid: true });
    } finally {
        await safeLogout(client);
    }
};

const markMessagesRead: ImapTransports['markRead'] = async (config, request) => {
    const client = imapClient(config);
    await client.connect();
    try {
        // The mailbox must be writable for the \Seen flag; reading stays read-only.
        const mailbox = await client.mailboxOpen('INBOX');
        const uids = await resolveUids(client, request.messages, String(mailbox.uidValidity));
        if (uids.length) await client.messageFlagsAdd([...new Set(uids)], ['\\Seen'], { uid: true });
    } finally {
        await safeLogout(client);
    }
};

export const networkTransports: ImapTransports = { verify: verifyTransports, readInbox, send: sendMail, move: moveMessages, markRead: markMessagesRead };

const rejectHeaderInjection = (input: SendEmailInput) => {
    for (const value of [input.sender, input.senderName, input.recipient, input.subject, input.replyToMessageId, input.messageId]) {
        if (value && /[\r\n]/.test(value)) throw new Error('Invalid email header');
    }
};

const fromHeader = (input: SendEmailInput): OutgoingMail['from'] => {
    const address = z.string().email().parse(input.sender);
    return input.senderName ? { name: input.senderName, address } : address;
};

const normalizeAll = async (messages: RawImapMessage[], mailboxAddress: string) => {
    const normalized: NormalizedEmail[] = [];
    for (const message of messages) {
        const email = await normalizeImapMessage(message, mailboxAddress);
        if (email) normalized.push(email);
    }
    return normalized;
};

// A mailbox reached with a login and password: IMAP for reading, SMTP for sending.
export class ImapEmailProvider implements EmailProvider {
    private readonly config: ImapConfig;
    constructor(config: unknown, private readonly transports: ImapTransports = networkTransports) {
        this.config = imapConfigSchema.parse(config);
    }
    async testConnection() {
        await this.transports.verify(this.config);
        return { success: true };
    }
    async syncMessages(cursor?: string): Promise<EmailSyncPage> {
        const previous = parseImapCursor(cursor);
        const snapshot = await this.transports.readInbox(this.config, mailbox => rangeToFetch(previous, mailbox, INITIAL_SYNC_WINDOW));
        const messages = await normalizeAll(snapshot.messages, this.config.credentials.username);
        const sameMailbox = previous?.uidValidity === snapshot.uidValidity;
        const lastUid = Math.max(sameMailbox ? previous.lastUid : 0, snapshot.uidNext - 1, ...snapshot.messages.map(message => message.uid));
        return { messages, skipped: snapshot.messages.length - messages.length, cursor: formatImapCursor({ uidValidity: snapshot.uidValidity, lastUid }) };
    }
    async sendMessage(input: SendEmailInput) {
        rejectHeaderInjection(input);
        const sent = await this.transports.send(this.config, {
            from: fromHeader(input), to: z.string().email().parse(input.recipient),
            subject: input.subject, text: input.content,
            inReplyTo: input.replyToMessageId, references: input.replyToMessageId, messageId: input.messageId,
            ...(input.html ? { html: input.html } : {}),
            ...(input.attachments?.length ? { attachments: input.attachments } : {}),
        });
        return { externalId: sent.messageId, threadId: input.threadId };
    }
    async applyDisposition(messages: RemoteEmailRef[], disposition: EmailDisposition) {
        await this.transports.move(this.config, { messages, disposition });
    }
    async markRead(messages: RemoteEmailRef[]) {
        await this.transports.markRead(this.config, { messages });
    }
}
