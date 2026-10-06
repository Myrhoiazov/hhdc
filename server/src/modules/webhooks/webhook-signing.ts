import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

export const WEBHOOK_EVENTS = ['person.created', 'registration.created', 'ticket.created', 'checkin.completed', 'payment.paid', 'event.updated'] as const;
export const MAX_DELIVERY_ATTEMPTS = 6;

// Signature covers the timestamp so a captured payload cannot be replayed later.
export const signWebhookPayload = (secret: string, timestamp: number, body: string) =>
    `v1=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;

export const verifyWebhookSignature = (secret: string, timestamp: number, body: string, signature: string) => {
    const expected = Buffer.from(signWebhookPayload(secret, timestamp, body));
    const actual = Buffer.from(signature);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
};

// Exponential backoff: 1m, 2m, 4m, 8m, 16m; null once attempts are exhausted.
export const nextRetryDelayMs = (attempts: number): number | null =>
    attempts >= MAX_DELIVERY_ATTEMPTS ? null : 60_000 * 2 ** Math.max(0, attempts - 1);

const PRIVATE_V4 = [/^10\./, /^127\./, /^0\./, /^169\.254\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];
const isPrivateHost = (hostname: string) => {
    const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return true;
    if (isIP(host) === 6) return true;
    return isIP(host) === 4 && PRIVATE_V4.some(range => range.test(host));
};

// Outbound endpoints must be public HTTPS hosts: staff-configured URLs must not reach internal services.
export const assertPublicWebhookUrl = (value: string): URL => {
    const url = new URL(value);
    if (url.protocol !== 'https:') throw new Error('Webhook URL must use https');
    if (url.username || url.password) throw new Error('Webhook URL must not contain credentials');
    if (isPrivateHost(url.hostname)) throw new Error('Webhook URL must point to a public host');
    return url;
};
