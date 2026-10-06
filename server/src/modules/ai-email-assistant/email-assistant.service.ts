import { z } from 'zod';

const MAX_NORMALIZED_EMAIL_CHARS = 12_000;

const intentSchema = z.enum([
    'trial_lesson', 'schedule', 'pricing', 'subscription', 'payment', 'cancellation',
    'location', 'teacher', 'registration', 'event', 'complaint', 'partnership', 'other',
]);

export const emailClassificationSchema = z.object({
    spam: z.boolean(),
    needsReply: z.boolean(),
    language: z.enum(['nl', 'en', 'ua', 'ru', 'unknown']),
    intent: intentSchema,
    confidence: z.number().min(0).max(1),
    // Optional, unlike every field above: `reason` is audit/display text only — spec section 8
    // is explicit that it "must be short and must not be treated as hidden reasoning", i.e.
    // nothing branches on it. Observed live: a small local model occasionally produces every
    // other field correctly but omits just this one, which used to fail the whole classification
    // (and burn the one repair retry) over a field nothing downstream depends on.
    reason: z.string().trim().max(240).optional().default(''),
}).strict();

export type EmailClassification = z.infer<typeof emailClassificationSchema>;

export interface EmailClassificationInput {
    fromAddress: string;
    subject?: string | null;
    text?: string | null;
    html?: string | null;
    headers?: ReadonlyMap<string, unknown> | Map<string, unknown>;
}

export interface NormalizedEmailInput {
    fromAddress: string;
    subject: string;
    normalizedBody: string;
}

export interface LlmClient {
    classifyEmail(input: NormalizedEmailInput): Promise<EmailClassification>;
}

export interface ClassifiedEmail {
    normalizedBody: string;
    classification: EmailClassification;
}

const decodeEntities = (value: string) => value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

const htmlToText = (html: string): string => decodeEntities(html
    .replace(/<(script|style|nav|footer|form)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?p[^>]*>/gi, '\n')
    .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, ' '));

const cleanLines = (value: string): string => value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => !/^\s*>/.test(line) && !/^\s*(On .+ wrote:|Op .+ schreef:)/i.test(line))
    .join('\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const normalizeEmail = (input: EmailClassificationInput): NormalizedEmailInput => {
    const source = input.text?.trim() || (input.html ? htmlToText(input.html) : '');
    const normalizedBody = cleanLines(source).slice(0, MAX_NORMALIZED_EMAIL_CHARS);

    return {
        fromAddress: input.fromAddress.trim().toLowerCase(),
        subject: cleanLines(input.subject ?? '').slice(0, 500),
        normalizedBody,
    };
};

const headerValue = (headers: EmailClassificationInput['headers'], name: string): string => {
    if (!headers) return '';
    let result = '';
    headers.forEach((value, key) => {
        if (!result && key.toLowerCase() === name) result = String(value).trim().toLowerCase();
    });
    return result;
};

export const deterministicSpamReason = (
    input: EmailClassificationInput,
    normalized: NormalizedEmailInput,
): string | null => {
    if (!normalized.fromAddress) return 'missing_sender';
    if (/^(yes|true|1)(?:\s|$)/i.test(headerValue(input.headers, 'x-spam-flag'))) {
        return 'mailbox_spam_header';
    }
    if (/\bspam=yes\b/i.test(headerValue(input.headers, 'x-spam-status'))) {
        return 'mailbox_spam_status';
    }
    if (/\b(viagra|cryptocurrency investment|you won the lottery)\b/i.test(
        `${normalized.subject}\n${normalized.normalizedBody}`,
    )) {
        return 'obvious_spam_keyword';
    }
    return null;
};

export const classifyEmail = async (
    input: EmailClassificationInput,
    llmClient: LlmClient,
): Promise<ClassifiedEmail> => {
    const normalized = normalizeEmail(input);
    const spamReason = deterministicSpamReason(input, normalized);

    if (spamReason) {
        return {
            normalizedBody: normalized.normalizedBody,
            classification: {
                spam: true,
                needsReply: false,
                language: 'unknown',
                intent: 'other',
                confidence: 1,
                reason: spamReason,
            },
        };
    }

    const classification = emailClassificationSchema.parse(await llmClient.classifyEmail(normalized));
    return { normalizedBody: normalized.normalizedBody, classification };
};
