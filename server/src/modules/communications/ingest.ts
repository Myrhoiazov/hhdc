import { Prisma } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { contactAddress, type NormalizedEmail } from '../../integrations/email/EmailProvider';
import { emitDomainEvent } from '../outbox/outbox.service';

const identityKey = (providerConnectionId: string, entityType: string, externalId: string) => ({
    providerConnectionId_entityType_externalId: { providerConnectionId, entityType, externalId },
});

// A shared family address can belong to several people; only an unambiguous match is linked.
const findKnownPersonId = async (tx: Prisma.TransactionClient, address: string) => {
    const people = await tx.person.findMany({ where: { email: address, status: 'ACTIVE', mergedIntoId: null }, select: { id: true }, take: 2 });
    return people.length === 1 ? people[0].id : undefined;
};

const createPersonFromEmail = async (tx: Prisma.TransactionClient, address: string) => {
    const person = await tx.person.create({ data: {
        firstName: '', lastName: '', displayName: address, email: address, source: 'EMAIL',
        roles: { create: { role: 'CUSTOMER' } },
    } });
    await tx.activity.create({ data: { personId: person.id, type: 'PERSON_CREATED', entityType: 'Person', entityId: person.id, metadata: { source: 'EMAIL' } } });
    return person.id;
};

// Senders that are programs, not people: nobody will ever read a reply sent to them.
// "noreply" may stand anywhere in the name as a word of its own; the other names start it.
const NO_REPLY = /(^|[-+_.])(no[-_.]?reply|do[-_.]?not[-_.]?reply)\d*([-+_.]|$)/i;
const ROBOT_NAME = /^(mailer-daemon|postmaster|bounces?|notifications?|notify|newsletters?)\d*([-+_.]|$)/i;
export const isAutomaticSender = (address: string): boolean => {
    const name = address.trim().split('@')[0];
    return NO_REPLY.test(name) || ROBOT_NAME.test(name);
};

// An address makes no contact of its own when a program writes from it or when staff deleted
// the contact it once made. A person already in the CRM with this address is still linked.
const makesNoContact = async (tx: Prisma.TransactionClient, address: string): Promise<boolean> =>
    isAutomaticSender(address) || Boolean(await tx.emailContactBlock.count({ where: { address } }));

// The Person behind an address in this mailbox; an unknown address becomes a new contact,
// unless it is one that makes none — then the letter is kept without a person.
export const resolveContact = async (tx: Prisma.TransactionClient, providerId: string, address: string): Promise<string | null> => {
    const existing = await tx.externalIdentity.findUnique({ where: identityKey(providerId, 'EMAIL_CONTACT', address) });
    if (existing) return existing.entityId;
    const known = await findKnownPersonId(tx, address);
    if (!known && await makesNoContact(tx, address)) return null;
    const personId = known ?? await createPersonFromEmail(tx, address);
    await tx.externalIdentity.create({ data: { providerConnectionId: providerId, entityType: 'EMAIL_CONTACT', entityId: personId, externalId: address } });
    return personId;
};

const resolveThread = async (tx: Prisma.TransactionClient, providerId: string, email: NormalizedEmail, personId: string | null) => {
    const identity = await tx.externalIdentity.findUnique({ where: identityKey(providerId, 'EMAIL_THREAD', email.threadId) });
    if (identity) return tx.conversation.findUniqueOrThrow({ where: { id: identity.entityId } });
    
    // Safely associate to an Event if known: check if the person has exactly 1 recent registration
    const registrations = personId ? await tx.registration.findMany({
        where: { personId, event: { status: { in: ['PUBLISHED', 'ACTIVE'] } } },
        include: { event: true },
        take: 2,
    }) : [];
    const eventId = registrations.length === 1 ? registrations[0].eventId : undefined;

    const conversation = await tx.conversation.create({ data: { subject: email.subject, personId, eventId, lastMessageAt: email.receivedAt } });
    await tx.externalIdentity.create({ data: { providerConnectionId: providerId, entityType: 'EMAIL_THREAD', entityId: conversation.id, externalId: email.threadId } });
    return conversation;
};

const recordReceived = async (tx: Prisma.TransactionClient, conversation: { id: string; personId: string | null; eventId: string | null }, message: { id: string; receivedAt: Date | null }) => {
    const messageId = message.id;
    await tx.activity.create({ data: { personId: conversation.personId, eventId: conversation.eventId, type: 'EMAIL_RECEIVED', entityType: 'Message', entityId: messageId, metadata: {} } });
    await emitDomainEvent(tx, 'email.received', { entityType: 'Message', entityId: messageId, conversationId: conversation.id, personId: conversation.personId, eventId: conversation.eventId, receivedAt: message.receivedAt?.toISOString() ?? null });
};

const persistInbound = async (tx: Prisma.TransactionClient, providerId: string, email: NormalizedEmail) => {
    const existing = await tx.message.findUnique({ where: { providerConnectionId_externalId: { providerConnectionId: providerId, externalId: email.externalId } } });
    if (existing) return { message: existing, created: false };
    const personId = await resolveContact(tx, providerId, contactAddress(email));
    const conversation = await resolveThread(tx, providerId, email, personId);
    const message = await tx.message.create({ data: {
        conversationId: conversation.id, direction: 'INBOUND', sender: email.sender.toLowerCase(),
        recipient: email.recipient.toLowerCase(), subject: email.subject, bodyText: email.bodyText, bodyHtml: email.bodyHtml,
        externalId: email.externalId, providerConnectionId: providerId, receivedAt: email.receivedAt,
        isRead: email.isRead ?? false,
        rawData: { threadId: email.threadId, messageId: email.messageId ?? null, replyTo: email.replyTo ?? null,
            providerRef: email.providerRef ?? null },
    } });
    await tx.conversation.update({ where: { id: conversation.id }, data: { status: 'OPEN', lastMessageAt: email.receivedAt } });
    await recordReceived(tx, conversation, message);
    return { message, created: true };
};

const isWriteConflict = (error: unknown): boolean =>
    error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code);

const sleep = (ms: number): Promise<void> => new Promise(resolve => { setTimeout(resolve, ms); });

// Grows with every attempt and is spread at random, so two transactions that collided once
// do not come back at the same moment.
export const retryDelayMs = (attempt: number, random: () => number = Math.random): number =>
    Math.round(50 * 2 ** attempt * (0.5 + random()));

export interface RetryOptions {
    attempts?: number;
    isRetryable?: (error: unknown) => boolean;
    wait?: (ms: number) => Promise<void>;
}

// Two mailboxes syncing at once reject each other's serializable transactions. Retrying right
// away meets the same conflict again, so every attempt waits before the next one.
export const retryOnConflict = async <T>(work: () => Promise<T>, options: RetryOptions = {}): Promise<T> => {
    const attempts = options.attempts ?? 5;
    const isRetryable = options.isRetryable ?? isWriteConflict;
    const wait = options.wait ?? sleep;
    for (let attempt = 0; ; attempt += 1) {
        try { return await work(); }
        catch (error) {
            if (!isRetryable(error) || attempt >= attempts - 1) throw error;
            await wait(retryDelayMs(attempt));
        }
    }
};

export const ingestEmail = (providerId: string, email: NormalizedEmail) =>
    retryOnConflict(() => prisma.$transaction(tx => persistInbound(tx, providerId, email), { isolationLevel: 'Serializable' }));
