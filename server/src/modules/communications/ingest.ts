import { Prisma } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import type { NormalizedEmail } from '../../integrations/email/EmailProvider';

const identityKey = (providerConnectionId: string, entityType: string, externalId: string) => ({
    providerConnectionId_entityType_externalId: { providerConnectionId, entityType, externalId },
});

const resolveSender = async (tx: Prisma.TransactionClient, providerId: string, email: NormalizedEmail) => {
    const address = email.sender.toLowerCase();
    const existing = await tx.externalIdentity.findUnique({ where: identityKey(providerId, 'EMAIL_CONTACT', address) });
    if (existing) return existing.entityId;
    const person = await tx.person.create({ data: {
        firstName: '', lastName: '', displayName: address, email: address, source: 'EMAIL',
        roles: { create: { role: 'CUSTOMER' } },
    } });
    await tx.externalIdentity.create({ data: { providerConnectionId: providerId, entityType: 'EMAIL_CONTACT', entityId: person.id, externalId: address } });
    await tx.activity.create({ data: { personId: person.id, type: 'PERSON_CREATED', entityType: 'Person', entityId: person.id, metadata: { source: 'EMAIL' } } });
    return person.id;
};

const resolveThread = async (tx: Prisma.TransactionClient, providerId: string, email: NormalizedEmail, personId: string) => {
    const identity = await tx.externalIdentity.findUnique({ where: identityKey(providerId, 'EMAIL_THREAD', email.threadId) });
    if (identity) return tx.conversation.findUniqueOrThrow({ where: { id: identity.entityId } });
    
    // Safely associate to an Event if known: check if the person has exactly 1 recent registration
    const registrations = await tx.registration.findMany({
        where: { personId, event: { status: { in: ['PUBLISHED', 'ACTIVE'] } } },
        include: { event: true },
        take: 2,
    });
    const eventId = registrations.length === 1 ? registrations[0].eventId : undefined;

    const conversation = await tx.conversation.create({ data: { subject: email.subject, personId, eventId, lastMessageAt: email.receivedAt } });
    await tx.externalIdentity.create({ data: { providerConnectionId: providerId, entityType: 'EMAIL_THREAD', entityId: conversation.id, externalId: email.threadId } });
    return conversation;
};

const persistInbound = async (tx: Prisma.TransactionClient, providerId: string, email: NormalizedEmail) => {
    const existing = await tx.message.findUnique({ where: { providerConnectionId_externalId: { providerConnectionId: providerId, externalId: email.externalId } } });
    if (existing) return { message: existing, created: false };
    const personId = await resolveSender(tx, providerId, email);
    const conversation = await resolveThread(tx, providerId, email, personId);
    const message = await tx.message.create({ data: {
        conversationId: conversation.id, direction: 'INBOUND', sender: email.sender.toLowerCase(),
        recipient: email.recipient.toLowerCase(), subject: email.subject, bodyText: email.bodyText,
        externalId: email.externalId, providerConnectionId: providerId, receivedAt: email.receivedAt,
        rawData: { threadId: email.threadId, messageId: email.messageId ?? null },
    } });
    await tx.conversation.update({ where: { id: conversation.id }, data: { status: 'OPEN', lastMessageAt: email.receivedAt } });
    await tx.activity.create({ data: { personId: conversation.personId, eventId: conversation.eventId, type: 'EMAIL_RECEIVED', entityType: 'Message', entityId: message.id, metadata: {} } });
    return { message, created: true };
};

export const ingestEmail = async (providerId: string, email: NormalizedEmail) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try { return await prisma.$transaction(tx => persistInbound(tx, providerId, email), { isolationLevel: 'Serializable' }); }
        catch (error) {
            const retryable = error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code);
            if (!retryable || attempt === 2) throw error;
        }
    }
    throw new Error('Email ingestion retries exhausted');
};
