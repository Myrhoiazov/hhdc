import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { collectContacts, fetchAllOrders, type WeeztixContact } from '../../integrations/ticketing/weeztix/weeztix.contacts';
import { MARKETING_EMAIL_CONSENT } from '../campaigns/recipients';
import { getWeeztixAccessToken, readWeeztixCompanyGuid } from './weeztix-connection.service';

// Buyers of Weeztix orders become people of the CRM. A person is matched by the link made on an
// earlier import or by the exact email, never by a similar name; an email that several people
// share is left for a human. Details already present in the CRM are kept: only empty ones are filled.

// A preview unless the import is asked for explicitly: it reads Weeztix and writes nothing.
export const importContactsSchema = z.object({ dryRun: z.boolean().default(true) }).strict();

export interface ContactImportResult { dryRun: boolean; orders: number; contacts: number; created: number; linked: number; known: number; ambiguous: number; failed: number }
type Outcome = 'created' | 'linked' | 'known' | 'ambiguous';
type Db = Prisma.TransactionClient;

const PERSON_FIELDS = { id: true, firstName: true, lastName: true, displayName: true, email: true, phone: true, language: true, country: true } as const;
type PersonDetails = Prisma.PersonGetPayload<{ select: typeof PERSON_FIELDS }>;

const fullName = (contact: WeeztixContact): string => `${contact.firstName} ${contact.lastName}`.trim();

// A contact created from a mailbox is shown by its address until a name is known.
const hasPlaceholderName = (person: Pick<PersonDetails, 'displayName' | 'email'>): boolean =>
    !person.displayName.trim() || person.displayName.toLowerCase() === (person.email ?? '').toLowerCase();

export const fillMissing = (person: Omit<PersonDetails, 'id'>, contact: WeeztixContact): Prisma.PersonUpdateInput => {
    const offered: Array<[keyof Omit<PersonDetails, 'id'>, string, boolean]> = [
        ['firstName', contact.firstName, !person.firstName.trim()],
        ['lastName', contact.lastName, !person.lastName.trim()],
        ['displayName', fullName(contact), hasPlaceholderName(person)],
        ['phone', contact.phone, !person.phone],
        ['language', contact.language, !person.language],
        ['country', contact.country, !person.country],
    ];
    return Object.fromEntries(offered.filter(([, value, empty]) => empty && value).map(([field, value]) => [field, value]));
};

const identityKey = (connectionId: string, email: string) => ({
    providerConnectionId_entityType_externalId: { providerConnectionId: connectionId, entityType: 'PERSON', externalId: email },
});

const createPerson = async (tx: Db, contact: WeeztixContact): Promise<string> => {
    const person = await tx.person.create({ data: {
        firstName: contact.firstName, lastName: contact.lastName, displayName: fullName(contact) || contact.email, email: contact.email,
        phone: contact.phone || null, language: contact.language || null, country: contact.country || null, source: 'WEEZTIX',
    }, select: { id: true } });
    await tx.activity.create({ data: { personId: person.id, type: 'PERSON_CREATED', entityType: 'Person', entityId: person.id, metadata: { source: 'WEEZTIX' } } });
    return person.id;
};

const enrichPerson = async (tx: Db, person: PersonDetails, contact: WeeztixContact): Promise<string> => {
    const data = fillMissing(person, contact);
    if (Object.keys(data).length) await tx.person.update({ where: { id: person.id }, data });
    return person.id;
};

// Consent given at checkout is recorded once; a consent already stored in the CRM, granted or
// withdrawn, is never overwritten by the import.
const recordPurchase = async (tx: Db, personId: string, contact: WeeztixContact): Promise<void> => {
    await tx.personRole.upsert({ where: { personId_role: { personId, role: 'CUSTOMER' } }, create: { personId, role: 'CUSTOMER' }, update: {} });
    if (!contact.marketing) return;
    await tx.consent.upsert({
        where: { personId_type: { personId, type: MARKETING_EMAIL_CONSENT } }, update: {},
        create: { personId, type: MARKETING_EMAIL_CONSENT, status: 'GRANTED', source: 'WEEZTIX', capturedAt: new Date(contact.marketingAt ?? contact.firstOrderAt), metadata: { question: 'keep_me_informed' } },
    });
};

const linkMetadata = (contact: WeeztixContact): Prisma.InputJsonObject => ({ orders: contact.orderGuids.length, firstOrderAt: contact.firstOrderAt });

const refreshKnown = async (tx: Db, personId: string, contact: WeeztixContact): Promise<Outcome> => {
    const person = await tx.person.findUnique({ where: { id: personId }, select: PERSON_FIELDS });
    if (person) await recordPurchase(tx, await enrichPerson(tx, person, contact), contact);
    return 'known';
};

interface ImportContext { connectionId: string; dryRun: boolean }

const importContact = async (tx: Db, context: ImportContext, contact: WeeztixContact): Promise<Outcome> => {
    const identity = await tx.externalIdentity.findUnique({ where: identityKey(context.connectionId, contact.email) });
    if (identity) return context.dryRun ? 'known' : refreshKnown(tx, identity.entityId, contact);
    const matches = await tx.person.findMany({ where: { email: { equals: contact.email, mode: 'insensitive' }, status: 'ACTIVE', mergedIntoId: null }, select: PERSON_FIELDS, take: 2 });
    if (matches.length > 1) return 'ambiguous';
    const outcome: Outcome = matches.length ? 'linked' : 'created';
    if (context.dryRun) return outcome;
    const personId = matches.length ? await enrichPerson(tx, matches[0], contact) : await createPerson(tx, contact);
    await tx.externalIdentity.create({ data: { providerConnectionId: context.connectionId, entityType: 'PERSON', entityId: personId, externalId: contact.email, metadata: linkMetadata(contact) } });
    await recordPurchase(tx, personId, contact);
    return outcome;
};

const emptyResult = (dryRun: boolean, orders: number, contacts: number): ContactImportResult =>
    ({ dryRun, orders, contacts, created: 0, linked: 0, known: 0, ambiguous: 0, failed: 0 });

// Each contact is saved on its own, so one broken record does not undo the others.
const importEach = async (context: ImportContext, contacts: WeeztixContact[], result: ContactImportResult): Promise<string | null> => {
    let firstError: string | null = null;
    for (const contact of contacts) {
        try {
            result[context.dryRun ? await importContact(prisma, context, contact) : await prisma.$transaction(tx => importContact(tx, context, contact))] += 1;
        } catch (error) {
            result.failed += 1;
            firstError ??= (error instanceof Error ? error.message : 'Unknown error').slice(0, 300);
        }
    }
    return firstError;
};

const finishRun = (runId: string, result: ContactImportResult, error: string | null) => prisma.syncRun.update({
    where: { id: runId },
    data: {
        status: result.failed ? 'FAILED' : 'SUCCEEDED', finishedAt: new Date(), errorSummary: error,
        createdCount: result.created, updatedCount: result.linked, skippedCount: result.known + result.ambiguous, failedCount: result.failed,
    },
});

// Buyers of orders that were already read, saved as people. Used when orders are synced, so
// every order finds its buyer; it keeps no run of its own.
export const saveContactsFromOrders = async (connectionId: string, orders: unknown[]): Promise<ContactImportResult> => {
    const contacts = collectContacts(orders);
    const result = emptyResult(false, orders.length, contacts.length);
    await importEach({ connectionId, dryRun: false }, contacts, result);
    return result;
};

export const importWeeztixContacts = async (connectionId: string, input: z.infer<typeof importContactsSchema>): Promise<ContactImportResult> => {
    const companyGuid = await readWeeztixCompanyGuid(connectionId);
    const orders = await fetchAllOrders({ accessToken: await getWeeztixAccessToken(connectionId), companyGuid });
    const contacts = collectContacts(orders);
    const result = emptyResult(input.dryRun, orders.length, contacts.length);
    const context = { connectionId, dryRun: input.dryRun };
    if (input.dryRun) {
        await importEach(context, contacts, result);
        return result;
    }
    const run = await prisma.syncRun.create({ data: { providerConnectionId: connectionId, type: 'WEEZTIX_SYNC', metadata: { scope: 'CONTACTS', orders: orders.length } }, select: { id: true } });
    await finishRun(run.id, result, await importEach(context, contacts, result));
    return result;
};
