import { z } from 'zod';
import { simpleParser, type AddressObject } from 'mailparser';
import MailComposer from 'nodemailer/lib/mail-composer';
import type { EmailDisposition, EmailProvider, EmailSyncPage, NormalizedEmail, RemoteEmailRef, SendEmailInput } from '../EmailProvider';

const credentialsSchema = z.object({ accessToken: z.string().optional(), refreshToken: z.string().optional(), clientId: z.string().optional(), clientSecret: z.string().optional() });
type Credentials = z.infer<typeof credentialsSchema>;
const messageListSchema = z.object({ messages: z.array(z.object({ id: z.string() })).default([]), nextPageToken: z.string().optional() });
const rawMessageSchema = z.object({ id: z.string(), threadId: z.string(), raw: z.string(), internalDate: z.string(), labelIds: z.array(z.string()).default([]) });
const sendResultSchema = z.object({ id: z.string(), threadId: z.string().optional() });

const assertSafeHeaders = (input: SendEmailInput) => {
    for (const value of [input.sender, input.senderName, input.recipient, input.subject, input.replyToMessageId, input.messageId]) {
        if (value && /[\r\n]/.test(value)) throw new Error('Invalid email header');
    }
};

// A letter with files or an HTML version needs a multipart body, which is left to a MIME library.
export const buildRawEmailWithAttachments = async (input: SendEmailInput): Promise<string> => {
    assertSafeHeaders(input);
    const mime = await new MailComposer({
        from: input.senderName ? { name: input.senderName, address: z.string().email().parse(input.sender) } : z.string().email().parse(input.sender),
        to: z.string().email().parse(input.recipient),
        subject: input.subject, text: input.content, html: input.html, messageId: input.messageId,
        inReplyTo: input.replyToMessageId, references: input.replyToMessageId, attachments: input.attachments,
    }).compile().build();
    return mime.toString('base64url');
};

// A display name is sent as an RFC 2047 encoded word, so any alphabet survives the header.
const encodedFrom = (input: SendEmailInput): string => {
    const address = z.string().email().parse(input.sender);
    return input.senderName ? `=?UTF-8?B?${Buffer.from(input.senderName).toString('base64')}?= <${address}>` : address;
};

export const buildRawEmail = (input: SendEmailInput): string => {
    assertSafeHeaders(input);
    const headers = [`From: ${encodedFrom(input)}`, `To: ${z.string().email().parse(input.recipient)}`,
        `Subject: =?UTF-8?B?${Buffer.from(input.subject).toString('base64')}?=`, 'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64'];
    if (input.replyToMessageId) headers.push(`In-Reply-To: ${input.replyToMessageId}`, `References: ${input.replyToMessageId}`);
    if (input.messageId) headers.push(`Message-ID: ${input.messageId}`);
    return Buffer.from(`${headers.join('\r\n')}\r\n\r\n${Buffer.from(input.content).toString('base64')}`).toString('base64url');
};

const emailAddress = z.string().trim().toLowerCase().email();
const firstAddress = (field?: AddressObject | AddressObject[]): string | undefined => {
    const parsed = emailAddress.safeParse((Array.isArray(field) ? field[0] : field)?.value[0]?.address);
    return parsed.success ? parsed.data : undefined;
};

// Returns null when the message has no usable sender or recipient; the caller counts it as skipped.
const normalizeRawMessage = async (value: unknown): Promise<NormalizedEmail | null> => {
    const message = rawMessageSchema.parse(value);
    const parsed = await simpleParser(Buffer.from(message.raw, 'base64url'));
    const sender = firstAddress(parsed.from);
    const recipient = firstAddress(parsed.to);
    if (!sender || !recipient) return null;
    const replyTo = firstAddress(parsed.replyTo);
    return { externalId: message.id, threadId: message.threadId, sender, recipient,
        subject: parsed.subject ?? '(No subject)', bodyText: parsed.text ?? '',
        bodyHtml: typeof parsed.html === 'string' ? parsed.html : undefined,
        receivedAt: z.coerce.date().parse(Number(message.internalDate)), messageId: parsed.messageId,
        replyTo: replyTo && replyTo !== sender ? replyTo : undefined,
        isRead: !message.labelIds.includes('UNREAD'),
    };
};

// Gmail's `after:` has one-second resolution; re-reading a small overlap is cheap because
// ingestion deduplicates by message id, while a gap would lose mail.
const CURSOR_OVERLAP_SECONDS = 60;

const inboxQuery = (cursor?: string): string => {
    const since = Number(cursor);
    return Number.isFinite(since) && since > 0 ? `in:inbox after:${Math.max(0, since - CURSOR_OVERLAP_SECONDS)}` : 'in:inbox';
};

const nextCursor = (messages: NormalizedEmail[], previous?: string): string | undefined => {
    const newest = Math.max(Number(previous) || 0, ...messages.map(message => Math.floor(message.receivedAt.getTime() / 1000)));
    return newest > 0 ? String(newest) : undefined;
};

export class GmailEmailProvider implements EmailProvider {
    private readonly credentials: Credentials;
    constructor(credentials: unknown, private readonly fetchImpl: typeof fetch = fetch) {
        this.credentials = credentialsSchema.parse(credentials);
    }
    private async accessToken(): Promise<string> {
        if (this.credentials.refreshToken) {
            const response = await this.fetchImpl('https://oauth2.googleapis.com/token', {
                method: 'POST', signal: AbortSignal.timeout(30000),
                body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: this.credentials.refreshToken,
                    client_id: this.credentials.clientId ?? process.env.GMAIL_CLIENT_ID ?? '',
                    client_secret: this.credentials.clientSecret ?? process.env.GMAIL_CLIENT_SECRET ?? '' }),
            });
            if (!response.ok) throw new Error(`Gmail token refresh failed (${response.status})`);
            return z.object({ access_token: z.string() }).parse(await response.json()).access_token;
        }
        return z.string().min(1).parse(this.credentials.accessToken);
    }
    private async request(path: string, options: RequestInit = {}): Promise<unknown> {
        const response = await this.fetchImpl(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
            ...options, signal: AbortSignal.timeout(30000),
            headers: { authorization: `Bearer ${await this.accessToken()}`, 'content-type': 'application/json' },
        });
        if (!response.ok) throw new Error(`Gmail request failed (${response.status})`);
        return response.status === 204 ? undefined : response.json();
    }
    async testConnection() {
        await this.request('profile');
        return { success: true };
    }
    // Without a cursor only the newest page is imported; afterwards every page since the cursor.
    private async listInboxIds(cursor?: string): Promise<string[]> {
        const ids: string[] = [];
        let pageToken: string | undefined;
        do {
            const query = new URLSearchParams({ maxResults: '50', q: inboxQuery(cursor) });
            if (pageToken) query.set('pageToken', pageToken);
            const result = messageListSchema.parse(await this.request(`messages?${query}`));
            ids.push(...result.messages.map(item => item.id));
            pageToken = result.nextPageToken;
        } while (cursor && pageToken);
        return ids;
    }
    async syncMessages(cursor?: string): Promise<EmailSyncPage> {
        const ids = await this.listInboxIds(cursor);
        const messages: NormalizedEmail[] = [];
        for (const id of ids) {
            const email = await normalizeRawMessage(await this.request(`messages/${encodeURIComponent(id)}?format=raw`));
            if (email) messages.push(email);
        }
        return { messages, skipped: ids.length - messages.length, cursor: nextCursor(messages, cursor) };
    }
    async sendMessage(input: SendEmailInput) {
        const raw = input.attachments?.length || input.html ? await buildRawEmailWithAttachments(input) : buildRawEmail(input);
        const result = sendResultSchema.parse(await this.request('messages/send', {
            method: 'POST', body: JSON.stringify({ raw, threadId: input.threadId }),
        }));
        return { externalId: result.id, threadId: result.threadId };
    }
    async applyDisposition(messages: RemoteEmailRef[], disposition: EmailDisposition) {
        const threadIds = [...new Set(messages.map(message => message.threadId).filter((id): id is string => Boolean(id)))];
        for (const threadId of threadIds) {
            const path = `threads/${encodeURIComponent(threadId)}/${disposition === 'TRASH' ? 'trash' : 'modify'}`;
            const body = disposition === 'SPAM' ? JSON.stringify({ addLabelIds: ['SPAM'], removeLabelIds: ['INBOX'] }) : undefined;
            await this.request(path, { method: 'POST', body });
        }
    }
    async markRead(messages: RemoteEmailRef[]) {
        for (const message of messages) {
            await this.request(`messages/${encodeURIComponent(message.externalId)}/modify`, {
                method: 'POST', body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
            });
        }
    }
}
