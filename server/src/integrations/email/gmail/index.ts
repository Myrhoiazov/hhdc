import { z } from 'zod';
import { simpleParser } from 'mailparser';
import type { EmailProvider, NormalizedEmail, SendEmailInput } from '../EmailProvider';

const credentialsSchema = z.object({ accessToken: z.string().optional(), refreshToken: z.string().optional(), clientId: z.string().optional(), clientSecret: z.string().optional() });
type Credentials = z.infer<typeof credentialsSchema>;
const messageListSchema = z.object({ messages: z.array(z.object({ id: z.string() })).default([]), nextPageToken: z.string().optional() });
const rawMessageSchema = z.object({ id: z.string(), threadId: z.string(), raw: z.string(), internalDate: z.string() });
const sendResultSchema = z.object({ id: z.string(), threadId: z.string().optional() });

export const buildRawEmail = (input: SendEmailInput): string => {
    for (const value of [input.sender, input.recipient, input.subject, input.replyToMessageId, input.messageId]) {
        if (value && /[\r\n]/.test(value)) throw new Error('Invalid email header');
    }
    const headers = [`From: ${z.string().email().parse(input.sender)}`, `To: ${z.string().email().parse(input.recipient)}`,
        `Subject: =?UTF-8?B?${Buffer.from(input.subject).toString('base64')}?=`, 'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64'];
    if (input.replyToMessageId) headers.push(`In-Reply-To: ${input.replyToMessageId}`, `References: ${input.replyToMessageId}`);
    if (input.messageId) headers.push(`Message-ID: ${input.messageId}`);
    return Buffer.from(`${headers.join('\r\n')}\r\n\r\n${Buffer.from(input.content).toString('base64')}`).toString('base64url');
};

const normalizeRawMessage = async (value: unknown): Promise<NormalizedEmail> => {
    const message = rawMessageSchema.parse(value);
    const parsed = await simpleParser(Buffer.from(message.raw, 'base64url'));
    return { externalId: message.id, threadId: message.threadId,
        sender: z.string().email().parse(parsed.from?.value[0]?.address),
        recipient: z.string().email().parse((Array.isArray(parsed.to) ? parsed.to[0] : parsed.to)?.value[0]?.address),
        subject: parsed.subject ?? '(No subject)', bodyText: parsed.text ?? '',
        receivedAt: z.coerce.date().parse(Number(message.internalDate)), messageId: parsed.messageId };
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
        return response.json();
    }
    async testConnection() {
        await this.request('profile');
        return { success: true };
    }
    async syncMessages(cursor?: string) {
        const query = new URLSearchParams({ maxResults: '50', q: 'in:inbox' });
        if (cursor) query.set('pageToken', cursor);
        const page = messageListSchema.parse(await this.request(`messages?${query}`));
        const messages: NormalizedEmail[] = [];
        for (const item of page.messages) messages.push(await normalizeRawMessage(await this.request(`messages/${encodeURIComponent(item.id)}?format=raw`)));
        return { messages, cursor: page.nextPageToken };
    }
    async sendMessage(input: SendEmailInput) {
        const result = sendResultSchema.parse(await this.request('messages/send', {
            method: 'POST', body: JSON.stringify({ raw: buildRawEmail(input), threadId: input.threadId }),
        }));
        return { externalId: result.id, threadId: result.threadId };
    }
}
