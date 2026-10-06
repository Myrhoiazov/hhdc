import { Prisma } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';

export const MAX_OUTBOX_ATTEMPTS = 5;

// Transactional outbox (ADR 0009): the event row commits atomically with the business change.
export const emitDomainEvent = (tx: Prisma.TransactionClient, topic: string, payload: Prisma.InputJsonObject) =>
    tx.outboxEvent.create({ data: { topic, payload } });

// Activity/audit history types that are also published as domain events.
const HISTORY_TOPICS: Record<string, string> = {
    PERSON_CREATED: 'person.created',
    ROLE_ADDED: 'person.role_added',
    EVENT_UPDATED: 'event.updated',
    REGISTRATION_CREATED: 'registration.created',
    REGISTRATION_CANCELLED: 'registration.cancelled',
    CHOREOGRAPHER_CONFIRMED: 'choreographer.confirmed',
};

export interface HistoryEventInput { type: string; entityType: string; entityId: string; personId?: string; eventId?: string }

export const historyEventPayload = (input: HistoryEventInput): Prisma.InputJsonObject => ({
    entityType: input.entityType,
    entityId: input.entityId,
    personId: input.personId ?? null,
    eventId: input.eventId ?? null,
    ...(input.entityType === 'Registration' ? { registrationId: input.entityId } : {}),
});

export const emitHistoryEvent = async (tx: Prisma.TransactionClient, input: HistoryEventInput) => {
    const topic = HISTORY_TOPICS[input.type];
    if (topic) await emitDomainEvent(tx, topic, historyEventPayload(input));
};

export const pendingOutboxEvents = (batchSize = 50) =>
    prisma.outboxEvent.findMany({ where: { status: 'PENDING' }, take: batchSize, orderBy: { createdAt: 'asc' } });

// Optimistic claim: only the worker that bumps `attempts` first processes the event.
export const claimOutboxEvent = async (event: { id: string; attempts: number }) => {
    const claimed = await prisma.outboxEvent.updateMany({ where: { id: event.id, status: 'PENDING', attempts: event.attempts }, data: { attempts: { increment: 1 } } });
    return claimed.count === 1;
};

export const outboxFailureStatus = (attemptsMade: number) => (attemptsMade >= MAX_OUTBOX_ATTEMPTS ? 'FAILED' : 'PENDING');
