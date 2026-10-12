import type { InlineKeyboard } from '../../../integrations/telegram/bot';
import { buildCallbackData } from './callback';

export interface ApprovalRequest {
    draftId: string;
    sender: string;
    senderName?: string | null;
    mailbox?: string | null;
    subject: string;
    incoming: string;
    draft: string;
    language: string;
    intent: string;
    confidence: number | null;
    needsStaffReview: boolean;
    warnings: string[];
    sources: string[];
    // Address of the conversation in the CRM; empty when the CRM has no address configured.
    link: string;
}

const INCOMING_CHARS = 1200;
const DRAFT_CHARS = 2000;
const MAX_SOURCES = 4;

export const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clip = (value: string, max: number): string => (value.length > max ? `${value.slice(0, max).trimEnd()}…` : value);
const quote = (value: string, max: number): string => `<blockquote>${escapeHtml(clip(value.trim(), max))}</blockquote>`;

// "kb-v2://hhdc-knowledge-v1/02_event/prices.md" → "02_event/prices.md"
export const sourceLabel = (url: string): string => url.replace(/^[a-z0-9-]+:\/\/[^/]+\//i, '');

const heading = (request: ApprovalRequest): string[] => [
    '<b>📨 Новое письмо — черновик ответа на утверждение</b>',
    `<b>От:</b> ${escapeHtml(request.senderName ? `${request.senderName} <${request.sender}>` : request.sender)}`,
    ...(request.mailbox ? [`<b>Ящик:</b> ${escapeHtml(request.mailbox)}`] : []),
    `<b>Тема:</b> ${escapeHtml(clip(request.subject, 200))}`,
    `<b>Язык / тема:</b> ${escapeHtml(request.language)} / ${escapeHtml(request.intent)}${request.confidence === null ? '' : ` · уверенность ${Math.round(request.confidence * 100)}%`}`,
];

const reviewNote = (request: ApprovalRequest): string[] => (request.needsStaffReview
    ? [`⚠️ <b>Нужна проверка человеком</b>${request.warnings.length ? `: ${escapeHtml(request.warnings.join(', '))}` : ''}`]
    : []);

const sourceList = (sources: string[]): string[] => {
    const labels = [...new Set(sources.map(sourceLabel))].slice(0, MAX_SOURCES);
    return labels.length ? ['', '<b>Источники:</b>', ...labels.map(label => `• ${escapeHtml(label)}`)] : [];
};

// Telegram refuses a button whose address it cannot open from the internet, so a CRM that is
// only reachable locally is named in the text instead.
export const isPublicLink = (link: string): boolean => /^https:\/\/(?!localhost|127\.|\[::1\])/i.test(link);

export const approvalKeyboard = (request: ApprovalRequest): InlineKeyboard => [
    [
        { text: '✅ Отправить', callback_data: buildCallbackData(request.draftId, 'approve', request.draft) },
        { text: '❌ Отклонить', callback_data: buildCallbackData(request.draftId, 'reject', request.draft) },
    ],
    [
        { text: '🚫 Спам', callback_data: buildCallbackData(request.draftId, 'spam', request.draft) },
        ...(isPublicLink(request.link) ? [{ text: '✏️ Открыть в CRM', url: request.link }] : []),
    ],
];

export const buildApprovalMessage = (request: ApprovalRequest): { text: string; keyboard: InlineKeyboard } => ({
    text: [
        ...heading(request),
        ...reviewNote(request),
        '', '<b>Письмо:</b>', quote(request.incoming, INCOMING_CHARS),
        '', '<b>Черновик ответа:</b>', quote(request.draft, DRAFT_CHARS),
        ...sourceList(request.sources),
        ...(request.link && !isPublicLink(request.link) ? ['', `Изменить текст: ${escapeHtml(request.link)}`] : []),
    ].join('\n'),
    keyboard: approvalKeyboard(request),
});
