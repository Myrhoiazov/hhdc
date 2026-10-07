// Turns a plain-text reply and the mailbox's HTML footer into the two bodies an email carries:
// HTML for mail clients that render it and plain text for those that do not.

export interface EmailBody { text: string; html?: string }

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, character => ESCAPES[character]);

// The footer is written by an administrator, but it is sent to customers, so anything that can
// run or load code is removed: script-like elements, inline event handlers and script URLs.
export const sanitizeFooterHtml = (html: string): string => html
    .replace(/<\s*(script|style|iframe|object|embed|form|link|meta)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*\/?\s*(script|style|iframe|object|embed|form|link|meta)\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("\s*(?:javascript|data|vbscript):[^"]*"|'\s*(?:javascript|data|vbscript):[^']*')/gi, '$1="#"')
    .trim();

const decodeEntities = (value: string): string => value
    .replace(/&nbsp;/gi, ' ').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&amp;/gi, '&');

// Plain-text rendering of the footer: one line per block, links written out as "label: url".
export const footerToText = (html: string): string => decodeEntities(html
    // Source line breaks are layout, not content: only block ends start a new line.
    .replace(/\s*\r?\n\s*/g, ' ')
    .replace(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a\s*>/gi, (_match, url: string, label: string) => {
        const text = label.replace(/<[^>]+>/g, '').trim();
        return !text || text === url || url.includes(text.replace(/^www\./, '')) ? url : `${text} (${url})`;
    })
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|tr)\s*>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ''))
    .split('\n').map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');

const textToHtml = (text: string): string => escapeHtml(text).replace(/\r?\n/g, '<br>\n');

// Without a footer the email stays plain text, exactly as before.
export const renderEmailBody = (content: string, footerHtml?: string | null): EmailBody => {
    const footer = sanitizeFooterHtml(footerHtml ?? '');
    if (!footer) return { text: content };
    return {
        text: `${content}\n\n${footerToText(footer)}`,
        html: `<div>${textToHtml(content)}</div>\n<br>\n${footer}`,
    };
};
