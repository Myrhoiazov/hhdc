import type { EventStatus, Prisma } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { fetchCatalog, fetchCoupons, type CatalogCoupon, type CatalogEvent, type CatalogTicketType } from '../../integrations/ticketing/weeztix/weeztix.catalog';
import { getWeeztixAccessToken, readWeeztixCompanyGuid } from './weeztix-connection.service';

// Events and ticket types of Weeztix in the CRM. An event is linked by its Weeztix GUID; what the
// last sync wrote is remembered next to the link, so a field edited by hand in the CRM is left
// alone afterwards. Ticket types belong to Weeztix entirely and are replaced on every sync.

const TIMEZONE = 'Europe/Amsterdam';
const TRACKED = ['name', 'description', 'startAt', 'endAt', 'venueName', 'address', 'capacity', 'status'] as const;
type TrackedField = typeof TRACKED[number];
export type EventSnapshot = { [Field in TrackedField]: Field extends 'status' ? EventStatus : Field extends 'capacity' ? number | null : string | null };

export interface CatalogSyncResult { events: number; created: number; updated: number; unchanged: number; ticketTypes: number; coupons: number; unreadable: number; failed: number }
type Outcome = 'created' | 'updated' | 'unchanged';
type Db = Prisma.TransactionClient;
interface SyncContext { connectionId: string; now: number }

// Weeztix has no "finished" state: an event that has ended is completed, the rest are on sale.
export const eventStatus = (endAt: string, now: number): EventStatus => (new Date(endAt).getTime() < now ? 'COMPLETED' : 'PUBLISHED');

const iso = (value: string | Date): string => new Date(value).toISOString();

export const toSnapshot = (event: CatalogEvent, now: number): EventSnapshot => ({
    name: event.name, description: event.description, startAt: iso(event.startAt), endAt: iso(event.endAt),
    venueName: event.venueName, address: event.address, capacity: event.capacity, status: eventStatus(event.endAt, now),
});

// A field follows Weeztix only while the CRM still holds what the last sync wrote there.
export const changesToApply = (current: EventSnapshot, last: Partial<EventSnapshot>, incoming: EventSnapshot): Partial<EventSnapshot> =>
    Object.fromEntries(TRACKED.filter(field => incoming[field] !== current[field] && current[field] === last[field]).map(field => [field, incoming[field]]));

export const eventSlug = (event: Pick<CatalogEvent, 'name' | 'guid'>): string => {
    const words = event.name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return `${words || 'event'}-${event.guid.slice(0, 8)}`;
};

const identityKey = (connectionId: string, guid: string) => ({
    providerConnectionId_entityType_externalId: { providerConnectionId: connectionId, entityType: 'EVENT', externalId: guid },
});

const createEvent = async (tx: Db, context: SyncContext, item: CatalogEvent): Promise<string> => {
    const synced = toSnapshot(item, context.now);
    const event = await tx.event.create({ data: { ...synced, startAt: item.startAt, endAt: item.endAt, slug: eventSlug(item), timezone: TIMEZONE }, select: { id: true } });
    await tx.externalIdentity.create({ data: { providerConnectionId: context.connectionId, entityType: 'EVENT', entityId: event.id, externalId: item.guid, metadata: { synced } } });
    await tx.activity.create({ data: { type: 'EVENT_SYNCED', entityType: 'Event', entityId: event.id, eventId: event.id, metadata: { source: 'WEEZTIX' } } });
    return event.id;
};

const EVENT_FIELDS = { name: true, description: true, startAt: true, endAt: true, venueName: true, address: true, capacity: true, status: true } as const;

const readSynced = (metadata: Prisma.JsonValue | null): Partial<EventSnapshot> =>
    (metadata && typeof metadata === 'object' && !Array.isArray(metadata) && metadata.synced && typeof metadata.synced === 'object' ? metadata.synced as Partial<EventSnapshot> : {});

interface KnownLink { id: string; entityId: string; metadata: Prisma.JsonValue | null }

// Returns whether anything changed. An event deleted in the CRM is not brought back.
const updateEvent = async (tx: Db, context: SyncContext, link: KnownLink, item: CatalogEvent): Promise<boolean> => {
    const event = await tx.event.findUnique({ where: { id: link.entityId }, select: EVENT_FIELDS });
    if (!event) return false;
    const synced = toSnapshot(item, context.now);
    const changes = changesToApply({ ...event, startAt: iso(event.startAt), endAt: iso(event.endAt) }, readSynced(link.metadata), synced);
    if (Object.keys(changes).length) await tx.event.update({ where: { id: link.entityId }, data: changes });
    await tx.externalIdentity.update({ where: { id: link.id }, data: { metadata: { synced } } });
    return Object.keys(changes).length > 0;
};

const saveTicketType = (tx: Db, context: SyncContext, target: { eventId: string; currency: string }, type: CatalogTicketType) => {
    const data = {
        eventId: target.eventId, name: type.name, description: type.description, price: type.price, currency: target.currency, vatPercentage: type.vatPercentage,
        status: type.status, availableFrom: type.availableFrom, availableUntil: type.availableUntil, soldCount: type.soldCount, rawData: type.raw as Prisma.InputJsonObject,
    };
    return tx.ticketType.upsert({
        where: { providerConnectionId_externalId: { providerConnectionId: context.connectionId, externalId: type.guid } },
        create: { ...data, providerConnectionId: context.connectionId, externalId: type.guid }, update: data,
    });
};

const syncEvent = async (tx: Db, context: SyncContext, item: CatalogEvent): Promise<Outcome> => {
    const link = await tx.externalIdentity.findUnique({ where: identityKey(context.connectionId, item.guid), select: { id: true, entityId: true, metadata: true } });
    const changed = link ? await updateEvent(tx, context, link, item) : true;
    const eventId = link ? link.entityId : await createEvent(tx, context, item);
    if (await tx.event.count({ where: { id: eventId } })) {
        for (const type of item.ticketTypes) await saveTicketType(tx, context, { eventId, currency: item.currency }, type);
    }
    if (!link) return 'created';
    return changed ? 'updated' : 'unchanged';
};

// Each event is saved on its own, so one broken record does not undo the others.
const syncEach = async (context: SyncContext, catalog: CatalogEvent[], result: CatalogSyncResult): Promise<string | null> => {
    let firstError: string | null = null;
    for (const item of catalog) {
        try {
            result[await prisma.$transaction(tx => syncEvent(tx, context, item))] += 1;
            result.ticketTypes += item.ticketTypes.length;
        } catch (error) {
            result.failed += 1;
            firstError ??= (error instanceof Error ? error.message : 'Unknown error').slice(0, 300);
        }
    }
    return firstError;
};

// Coupons belong to Weeztix entirely and are replaced on every sync.
const saveCoupon = (connectionId: string, coupon: CatalogCoupon) => {
    const data = {
        name: coupon.name, description: coupon.description, type: coupon.type, amount: coupon.amount, status: coupon.status,
        startsAt: coupon.startsAt, endsAt: coupon.endsAt, codes: coupon.codes, rawData: coupon.raw as Prisma.InputJsonObject,
    };
    return prisma.coupon.upsert({
        where: { providerConnectionId_externalId: { providerConnectionId: connectionId, externalId: coupon.guid } },
        create: { ...data, providerConnectionId: connectionId, externalId: coupon.guid }, update: data,
    });
};

// A record the CRM could not read makes the run fail visibly, even though the rest was saved.
export const unreadableNote = (unreadable: number): string | null =>
    (unreadable ? `Weeztix returned ${unreadable} record(s) in a format the CRM does not know; they were skipped` : null);

const finishRun = (runId: string, result: CatalogSyncResult, error: string | null) => prisma.syncRun.update({
    where: { id: runId },
    data: {
        status: result.failed || result.unreadable ? 'FAILED' : 'SUCCEEDED', finishedAt: new Date(), errorSummary: error ?? unreadableNote(result.unreadable),
        createdCount: result.created, updatedCount: result.updated, skippedCount: result.unchanged, failedCount: result.failed + result.unreadable,
    },
});

export const syncWeeztixCatalog = async (connectionId: string): Promise<CatalogSyncResult> => {
    const companyGuid = await readWeeztixCompanyGuid(connectionId);
    const access = { accessToken: await getWeeztixAccessToken(connectionId), companyGuid };
    const catalog = await fetchCatalog(access);
    const coupons = await fetchCoupons(access);
    const unreadable = catalog.unreadable + coupons.unreadable;
    const result: CatalogSyncResult = { events: catalog.items.length, created: 0, updated: 0, unchanged: 0, ticketTypes: 0, coupons: coupons.items.length, unreadable, failed: 0 };
    const run = await prisma.syncRun.create({ data: { providerConnectionId: connectionId, type: 'WEEZTIX_SYNC', metadata: { scope: 'CATALOG', events: catalog.items.length, unreadable } }, select: { id: true } });
    for (const coupon of coupons.items) await saveCoupon(connectionId, coupon);
    await finishRun(run.id, result, await syncEach({ connectionId, now: Date.now() }, catalog.items, result));
    return result;
};

export const listTicketTypes = (eventId: string) => prisma.ticketType.findMany({
    where: { eventId }, orderBy: [{ price: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, description: true, price: true, currency: true, vatPercentage: true, status: true, availableFrom: true, availableUntil: true, soldCount: true },
});
