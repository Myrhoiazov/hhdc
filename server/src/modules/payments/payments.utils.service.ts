import { Locale } from '@mollie/api-client';

export const paymentIssueStatuses = ['failed', 'canceled', 'expired', 'charged_back'] as const;

// Mollie's `locale` only accepts a fixed list of BCP 47 tags (no ru_RU) — used purely
// to set the language of Mollie's own hosted checkout page, unrelated to our reminder emails.
const clientLanguageToMollieLocale: Record<string, Locale | undefined> = {
    EN: Locale.en_US,
    NL: Locale.nl_NL,
    RU: undefined,
};

export const mapClientLanguageToMollieLocale = (preferredLanguage?: string | null): Locale | undefined => (
    preferredLanguage ? clientLanguageToMollieLocale[preferredLanguage] : undefined
);

export const normalizePaymentStatus = (status: string) => (
    status === 'chargeback' ? 'charged_back' : status
);

export const buildMollieWebhookDedupeKey = (payment: {
    id?: string;
    status: string;
    paidAt?: string | Date | null;
    amountRefunded?: { value: string } | null;
    amountChargedBack?: { value: string } | null;
}) => [
    payment.id,
    normalizePaymentStatus(payment.status),
    payment.paidAt ? new Date(payment.paidAt).toISOString() : '',
    payment.amountRefunded?.value ?? '0',
    payment.amountChargedBack?.value ?? '0',
].join(':');

const csvEscape = (value: unknown) => {
    const normalized = value instanceof Date
        ? value.toISOString()
        : value === null || value === undefined
            ? ''
            : String(value);

    return `"${normalized.replace(/"/g, '""')}"`;
};

export const createCsv = (headers: string[], rows: unknown[][]) => (
    `\uFEFF${[headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')}`
);

export const parseIncidentKey = (incidentKey: string) => {
    const match = /^(payment|subscription|customer)-(\d+)$/.exec(incidentKey);

    return match
        ? { incidentType: match[1] as 'payment' | 'subscription' | 'customer', sourceId: Number(match[2]) }
        : null;
};

export const getWebhookAttentionLevel = (status: string) => {
    const normalizedStatus = normalizePaymentStatus(status);

    if (normalizedStatus === 'paid') return 'success';
    if (paymentIssueStatuses.includes(normalizedStatus as typeof paymentIssueStatuses[number])) return 'attention';
    return 'info';
};

export interface MollieTokenExpiry {
    expires_in?: number;
    expires_at?: string | number;
}

export const getMollieTokenExpiresAt = (token: MollieTokenExpiry, now = Date.now()) => {
    if (token.expires_at) {
        const expiresAt = typeof token.expires_at === 'number'
            ? new Date(token.expires_at * 1000)
            : new Date(token.expires_at);

        if (!Number.isNaN(expiresAt.getTime())) {
            return expiresAt;
        }
    }

    return new Date(now + (token.expires_in ?? 3600) * 1000);
};
