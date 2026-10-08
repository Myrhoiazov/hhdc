import type { Prisma } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';

// A contact that a mailbox created on its own can be deleted. Anything tied to Weeztix, to a
// purchase, to an event or to money stays: deleting it would break the history behind it.

export const REMOVAL_BLOCKERS = ['WEEZTIX', 'PURCHASES', 'EVENTS', 'FINANCE', 'CHOREOGRAPHER', 'MAILINGS', 'NOT_FROM_EMAIL'] as const;
export type RemovalBlocker = typeof REMOVAL_BLOCKERS[number];
export interface PersonRemoval { allowed: boolean; blockers: RemovalBlocker[] }

const TIES = { orders: true, tickets: true, payments: true, refunds: true, registrations: true, choreographerAssignments: true, eventExpenses: true, consents: true, deliveryLogs: true } as const;
const TIES_SELECT = { id: true, source: true, choreographerProfile: { select: { personId: true } }, _count: { select: TIES } } as const;
type PersonTies = Prisma.PersonGetPayload<{ select: typeof TIES_SELECT }>;

export interface RemovalFacts {
    source: string; linkedToWeeztix: boolean; purchases: number; events: number; expenses: number; choreographer: boolean;
    // Consents (an opt-out included) and letters of campaigns: deleting the person would erase them.
    mailings: number;
}

export const removalFor = (facts: RemovalFacts): PersonRemoval => {
    const checks: Array<[RemovalBlocker, boolean]> = [
        ['WEEZTIX', facts.linkedToWeeztix || facts.source === 'WEEZTIX'],
        ['PURCHASES', facts.purchases > 0],
        ['EVENTS', facts.events > 0],
        ['FINANCE', facts.expenses > 0],
        ['CHOREOGRAPHER', facts.choreographer],
        ['MAILINGS', facts.mailings > 0],
        ['NOT_FROM_EMAIL', facts.source !== 'EMAIL' && facts.source !== 'WEEZTIX'],
    ];
    const blockers = checks.filter(([, blocked]) => blocked).map(([blocker]) => blocker);
    return { allowed: blockers.length === 0, blockers };
};

const toFacts = (person: PersonTies, linked: Set<string>): RemovalFacts => {
    const count = person._count;
    return {
        source: person.source, linkedToWeeztix: linked.has(person.id),
        purchases: count.orders + count.tickets + count.payments + count.refunds,
        events: count.registrations + count.choreographerAssignments,
        expenses: count.eventExpenses, choreographer: Boolean(person.choreographerProfile), mailings: count.consents + count.deliveryLogs,
    };
};

// People matched to a buyer of a ticketing provider, whatever created them first.
const linkedPeople = async (db: Prisma.TransactionClient, ids: string[]): Promise<Set<string>> => {
    const links = await db.externalIdentity.findMany({ where: { entityType: 'PERSON', entityId: { in: ids } }, select: { entityId: true } });
    return new Set(links.map(link => link.entityId));
};

export const removalByPerson = async (ids: string[], db: Prisma.TransactionClient = prisma): Promise<Map<string, PersonRemoval>> => {
    if (!ids.length) return new Map();
    const [people, linked] = await Promise.all([
        db.person.findMany({ where: { id: { in: ids } }, select: TIES_SELECT }),
        linkedPeople(db, ids),
    ]);
    return new Map(people.map(person => [person.id, removalFor(toFacts(person, linked))]));
};

const REASONS: Record<RemovalBlocker, string> = {
    WEEZTIX: 'it is linked to Weeztix', PURCHASES: 'it has purchases', EVENTS: 'it takes part in events',
    FINANCE: 'it has expenses', CHOREOGRAPHER: 'it has a choreographer profile', MAILINGS: 'it has a consent or a mailing history', NOT_FROM_EMAIL: 'it was not created from an email',
};

export const blockedMessage = (blockers: RemovalBlocker[]): string =>
    `This contact cannot be deleted: ${blockers.map(blocker => REASONS[blocker]).join(', ')}`;

// Letters stay in the mailbox without a contact. The link between the address and the person is
// removed with the person, so the next letter from this address finds no dead reference.
export const deleteEmailPerson = async (id: string) => prisma.$transaction(async tx => {
    const person = await tx.person.findUnique({ where: { id }, select: { id: true, displayName: true, email: true, source: true } });
    if (!person) throw new ApiError(404, 'PERSON_NOT_FOUND', 'Person not found');
    const removal = (await removalByPerson([id], tx)).get(id);
    if (!removal?.allowed) throw new ApiError(409, 'PERSON_DELETE_BLOCKED', blockedMessage(removal?.blockers ?? []));
    await tx.externalIdentity.deleteMany({ where: { entityId: id, entityType: 'EMAIL_CONTACT' } });
    await tx.person.delete({ where: { id } });
    return person;
});
