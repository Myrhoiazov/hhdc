import { z } from 'zod';

const MAX_NORMALIZED_EMAIL_CHARS = 12_000;

// HHDC intent taxonomy (knowledge/hhdc-knowledge-v2/14_intent_router/intents.md).
export const EMAIL_INTENTS = [
    'ticket', 'pricing', 'registration', 'payment', 'refund', 'cancellation', 'schedule', 'choreographer',
    'venue', 'check_in', 'competition', 'competition_category', 'competition_music', 'heels_master_stage',
    'travel', 'accommodation', 'partnership', 'technical_issue', 'complaint', 'event', 'other',
] as const;
export type EmailIntent = typeof EMAIL_INTENTS[number];

const isIntent = (value: unknown): value is EmailIntent => (EMAIL_INTENTS as readonly unknown[]).includes(value);
const MAX_SECONDARY_INTENTS = 3;

// Classifier output (14_intent_router/classifier-schema.md). Everything but the three decisive
// fields has a safe default: a small model that omits a flag must not fail the whole email.
export const emailClassificationSchema = z.object({
    spam: z.boolean().optional().default(false),
    needsReply: z.boolean(),
    replyLanguage: z.preprocess(value => (value === 'ua' ? 'uk' : value), z.enum(['en', 'nl', 'ru', 'uk', 'unknown']).catch('unknown')),
    intent: z.enum(EMAIL_INTENTS).catch('other'),
    secondaryIntents: z.array(z.unknown()).optional().default([]).transform(values => values.filter(isIntent).slice(0, MAX_SECONDARY_INTENTS)),
    needsCRM: z.boolean().optional().default(false),
    needsKnowledge: z.boolean().optional().default(true),
    needsHumanAction: z.boolean().optional().default(false),
    urgency: z.enum(['low', 'normal', 'high']).catch('normal').optional().default('normal'),
    confidence: z.number().min(0).max(1),
});

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
    // Earlier messages of the conversation as plain text, oldest first.
    thread?: string;
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
