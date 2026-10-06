import { randomBytes, randomUUID } from 'node:crypto';
import { Prisma, WebhookDelivery, WebhookEndpoint } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { decryptCredentials, encryptCredentials } from '../providers/providers.service';
import { MAX_DELIVERY_ATTEMPTS, WEBHOOK_EVENTS, assertPublicWebhookUrl, nextRetryDelayMs, signWebhookPayload } from './webhook-signing';

const DELIVERY_TIMEOUT_MS = 10_000;
const DELIVERY_BATCH = 25;

const publicUrl = z.string().url().max(2000).refine(value => {
    try { assertPublicWebhookUrl(value); return true; } catch { return false; }
}, 'Webhook URL must be a public https endpoint');

export const webhookEndpointSchema = z.object({
    name: z.string().trim().min(1).max(200),
    url: publicUrl,
    events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
    status: z.enum(['ACTIVE', 'DISABLED']).default('ACTIVE'),
}).strict();

export const safeEndpointSelect = { id: true, name: true, url: true, status: true, events: true, createdAt: true, updatedAt: true };

// The signing secret is returned exactly once, at creation.
export const createWebhookEndpoint = async (input: z.infer<typeof webhookEndpointSchema>, actorUserId: string) => {
    const secret = `whsec_${randomBytes(32).toString('base64url')}`;
    return prisma.$transaction(async tx => {
        const endpoint = await tx.webhookEndpoint.create({ data: { ...input, name: input.name, url: input.url, events: input.events, secretEncrypted: encryptCredentials({ secret }) }, select: safeEndpointSelect });
        await tx.auditLog.create({ data: { actorUserId, action: 'WEBHOOK_ENDPOINT_CREATED', entityType: 'WebhookEndpoint', entityId: endpoint.id } });
        return { ...endpoint, secret };
    });
};

const subscribes = (endpoint: WebhookEndpoint, eventType: string) =>
    z.array(z.string()).catch([]).parse(endpoint.events).includes(eventType);

export const enqueueWebhookDeliveries = async (eventType: string, payload: Prisma.InputJsonValue, eventId: string = randomUUID()) => {
    const endpoints = (await prisma.webhookEndpoint.findMany({ where: { status: 'ACTIVE' } })).filter(endpoint => subscribes(endpoint, eventType));
    if (!endpoints.length) return 0;
    const created = await prisma.webhookDelivery.createMany({
        data: endpoints.map(endpoint => ({ endpointId: endpoint.id, eventType, eventId, payload, nextRetryAt: new Date() })),
        skipDuplicates: true,
    });
    return created.count;
};

const postDelivery = async (endpoint: WebhookEndpoint, delivery: WebhookDelivery) => {
    const { secret } = decryptCredentials(endpoint.secretEncrypted);
    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({ id: delivery.eventId, type: delivery.eventType, data: delivery.payload });
    const response = await fetch(assertPublicWebhookUrl(endpoint.url), {
        method: 'POST', body, redirect: 'error', signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
        headers: { 'Content-Type': 'application/json', 'X-HHDC-Timestamp': String(timestamp), 'X-HHDC-Signature': signWebhookPayload(secret, timestamp, body) },
    });
    if (!response.ok) throw Object.assign(new Error(`Endpoint responded with ${response.status}`), { responseStatus: response.status });
    return response.status;
};

const recordFailure = async (delivery: WebhookDelivery, error: unknown) => {
    const attempts = delivery.attempts + 1;
    const delay = nextRetryDelayMs(attempts);
    const responseStatus = typeof (error as { responseStatus?: unknown })?.responseStatus === 'number' ? (error as { responseStatus: number }).responseStatus : null;
    await prisma.webhookDelivery.update({ where: { id: delivery.id }, data: {
        attempts, responseStatus, status: delay === null ? 'FAILED' : 'PENDING',
        lastError: error instanceof Error ? error.message.slice(0, 500) : 'Delivery failed',
        nextRetryAt: delay === null ? null : new Date(Date.now() + delay),
    } });
};

const attemptDelivery = async (delivery: WebhookDelivery & { endpoint: WebhookEndpoint }) => {
    try {
        const responseStatus = await postDelivery(delivery.endpoint, delivery);
        await prisma.webhookDelivery.update({ where: { id: delivery.id }, data: { status: 'DELIVERED', attempts: delivery.attempts + 1, responseStatus, lastError: null, nextRetryAt: null } });
    } catch (error) {
        await recordFailure(delivery, error);
    }
};

// Worker entry point: delivers due webhooks; failures are retried with exponential backoff.
export const processDueWebhookDeliveries = async () => {
    const due = await prisma.webhookDelivery.findMany({
        where: { status: 'PENDING', nextRetryAt: { lte: new Date() }, attempts: { lt: MAX_DELIVERY_ATTEMPTS }, endpoint: { status: 'ACTIVE' } },
        include: { endpoint: true }, orderBy: { nextRetryAt: 'asc' }, take: DELIVERY_BATCH,
    });
    for (const delivery of due) await attemptDelivery(delivery);
    return due.length;
};

export const requireEndpoint = async (id: string) => {
    const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id }, select: safeEndpointSelect });
    if (!endpoint) throw new ApiError(404, 'WEBHOOK_ENDPOINT_NOT_FOUND', 'Webhook endpoint not found');
    return endpoint;
};
