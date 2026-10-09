import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { fetchAllOrders } from '../../integrations/ticketing/weeztix/weeztix.contacts';
import { fetchShopNames } from '../../integrations/ticketing/weeztix/weeztix.catalog';
import { toOrder, type TicketState, type WeeztixOrder, type WeeztixTicket } from '../../integrations/ticketing/weeztix/weeztix.orders';
import { WeeztixFormatError } from '../../integrations/ticketing/weeztix/weeztix.json';
import { syncWeeztixCatalog, unreadableNote, type CatalogSyncResult } from './weeztix-catalog.service';
import { getWeeztixAccessToken, readWeeztixCompanyGuid, recordWeeztixSync } from './weeztix-connection.service';
import { saveContactsFromOrders } from './weeztix-contacts.service';
import { crmLink } from '../telegram-notifications/crm-link';
import { announce } from '../telegram-notifications/announce';
import { announceNewSales } from './sale-announcements';

// Orders of Weeztix in the CRM: order → lines by ticket type → tickets → payments, and a
// registration of the buyer for each event they hold a ticket to. Everything is matched by its
// Weeztix GUID, so running it again updates and never duplicates. Weeztix names only the buyer,
// so every ticket of an order is held by the buyer until staff gives it to someone else.

export interface OrderSyncResult { orders: number; created: number; updated: number; unchanged: number; tickets: number; registrations: number; newPeople: number; withoutBuyer: number; unreadable: number; failed: number; firstError: string | null }
export interface TicketTypeInfo { eventId: string; name: string }
interface Lookup { types: Map<string, TicketTypeInfo>; buyers: Map<string, string>; stored: Map<string, string>; shops: Map<string, string> }
interface SyncContext { connectionId: string; lookup: Lookup }
type Db = Prisma.TransactionClient;

export interface OrderLine { typeGuid: string; name: string; quantity: number; unitPrice: string; totalPrice: string }

// Raised when the way an order is stored changes, so every order is written again once.
const SYNC_VERSION = 2;

// The schedule reads every order each time; an order that looks exactly as it did when it was
// last stored is left alone.
export const orderFingerprint = (order: WeeztixOrder, shopName: string | null = null): string =>
    createHash('sha256').update(`${SYNC_VERSION}:${shopName}:${JSON.stringify(order)}`).digest('hex').slice(0, 32);

const CENTS = 100;
const cents = (amount: string): number => Math.round(Number(amount) * CENTS);

// One line per ticket type: the list price of a ticket and what was actually paid for all of them.
export const planLines = (tickets: WeeztixTicket[], types: Map<string, TicketTypeInfo>): OrderLine[] => {
    const lines = new Map<string, OrderLine & { paid: number }>();
    for (const ticket of tickets) {
        const line = lines.get(ticket.typeGuid) ?? { typeGuid: ticket.typeGuid, name: types.get(ticket.typeGuid)?.name ?? ticket.typeGuid, quantity: 0, unitPrice: ticket.listPrice, totalPrice: '0.00', paid: 0 };
        lines.set(ticket.typeGuid, { ...line, quantity: line.quantity + 1, paid: line.paid + cents(ticket.price) });
    }
    return [...lines.values()].map(({ paid, ...line }) => ({ ...line, totalPrice: (paid / CENTS).toFixed(2) }));
};

// A ticket checked in at the door is USED in the CRM while Weeztix still calls it valid; only a
// withdrawal (or a scan) reported by Weeztix changes what the CRM holds.
export const nextTicketStatus = (current: TicketState, incoming: TicketState): TicketState => (incoming === 'VALID' ? current : incoming);

const ADMISSIBLE: TicketState[] = ['VALID', 'USED'];
export const admits = (status: TicketState): boolean => ADMISSIBLE.includes(status);

const assertKnownTypes = (order: WeeztixOrder, types: Map<string, TicketTypeInfo>): void => {
    const unknown = order.tickets.find(ticket => !types.has(ticket.typeGuid));
    if (unknown) throw new Error(`Order ${order.guid} has a ticket type the CRM has not read yet: ${unknown.typeGuid}`);
};

interface SavedOrder { id: string; buyerId: string | null; created: boolean }

const saveOrder = async (tx: Db, context: SyncContext, order: WeeztixOrder): Promise<SavedOrder> => {
    const where = { providerConnectionId_externalId: { providerConnectionId: context.connectionId, externalId: order.guid } };
    const existing = await tx.order.findUnique({ where, select: { id: true, buyerPersonId: true } });
    const buyerId = existing?.buyerPersonId ?? context.lookup.buyers.get(order.email) ?? null;
    const shopName = context.lookup.shops.get(order.shopGuid) ?? null;
    const data = { status: order.status, currency: order.currency, subtotal: order.subtotal, fees: order.fees, total: order.total, buyerPersonId: buyerId,
        shopName, answers: order.answers.map(answer => ({ ...answer })), downloadUrl: order.downloadUrl,
        rawData: { ...order.raw, _fingerprint: orderFingerprint(order, shopName) } as Prisma.InputJsonObject,
    };
    if (existing) {
        await tx.order.update({ where: { id: existing.id }, data });
        return { id: existing.id, buyerId, created: false };
    }
    const eventId = context.lookup.types.get(order.tickets[0]?.typeGuid ?? '')?.eventId ?? null;
    const created = await tx.order.create({ data: { ...data, eventId, providerConnectionId: context.connectionId, externalId: order.guid, orderedAt: order.orderedAt }, select: { id: true } });
    await tx.activity.create({ data: { type: 'ORDER_SYNCED', entityType: 'Order', entityId: created.id, eventId, personId: buyerId, metadata: { source: 'WEEZTIX' } } });
    return { id: created.id, buyerId, created: true };
};

const saveLines = async (tx: Db, context: SyncContext, orderId: string, order: WeeztixOrder): Promise<Map<string, string>> => {
    const ids = new Map<string, string>();
    for (const line of planLines(order.tickets, context.lookup.types)) {
        const data = { name: line.name, quantity: line.quantity, unitPrice: line.unitPrice, totalPrice: line.totalPrice };
        const saved = await tx.orderItem.upsert({ where: { orderId_externalId: { orderId, externalId: line.typeGuid } }, create: { ...data, orderId, externalId: line.typeGuid }, update: data, select: { id: true } });
        ids.set(line.typeGuid, saved.id);
    }
    return ids;
};

interface SavedTicket { id: string; eventId: string; status: TicketState; scanned: boolean }
interface TicketTarget { orderId: string; buyerId: string | null; lineIds: Map<string, string> }

const saveTicket = async (tx: Db, context: SyncContext, target: TicketTarget, ticket: WeeztixTicket): Promise<SavedTicket> => {
    const type = context.lookup.types.get(ticket.typeGuid) as TicketTypeInfo;
    const where = { providerConnectionId_externalId: { providerConnectionId: context.connectionId, externalId: ticket.guid } };
    const existing = await tx.ticket.findUnique({ where, select: { id: true, status: true, holderPersonId: true } });
    const sale = { price: ticket.price, listPrice: ticket.listPrice, serviceFee: ticket.serviceFee, couponCode: ticket.couponCode, downloadUrl: ticket.downloadUrl, rawData: ticket.raw as Prisma.InputJsonObject };
    if (existing) {
        const status = nextTicketStatus(existing.status, ticket.status);
        // A ticket stored before its buyer was known gets the buyer now; a holder set by staff is kept.
        await tx.ticket.update({ where: { id: existing.id }, data: { ...sale, status, holderPersonId: existing.holderPersonId ?? target.buyerId } });
        return { id: existing.id, eventId: type.eventId, status, scanned: ticket.status === 'USED' };
    }
    const created = await tx.ticket.create({ data: {
        orderId: target.orderId, orderItemId: target.lineIds.get(ticket.typeGuid), eventId: type.eventId, holderPersonId: target.buyerId,
        providerConnectionId: context.connectionId, externalId: ticket.guid, ticketType: type.name, barcode: ticket.number || null, status: ticket.status, ...sale,
    }, select: { id: true } });
    return { id: created.id, eventId: type.eventId, status: ticket.status, scanned: ticket.status === 'USED' };
};

const savePayments = async (tx: Db, saved: SavedOrder, order: WeeztixOrder): Promise<void> => {
    for (const payment of order.payments) {
        const data = { amount: payment.amount, currency: payment.currency, status: payment.status, method: payment.method, paidAt: payment.paidAt, personId: saved.buyerId };
        await tx.payment.upsert({
            where: { orderId_externalId: { orderId: saved.id, externalId: payment.guid } }, update: data,
            create: { ...data, orderId: saved.id, externalId: payment.guid, metadata: { source: 'WEEZTIX' } },
        });
    }
};

// Another ticket of the same person that still lets them into the event, bought in any order.
const otherAdmission = (tx: Db, registration: { eventId: string; personId: string }, withdrawn: string[]) => tx.ticket.findFirst({
    where: { eventId: registration.eventId, holderPersonId: registration.personId, status: { in: ADMISSIBLE }, id: { notIn: withdrawn } },
    select: { id: true }, orderBy: { createdAt: 'asc' },
});

// A registration made from a ticket that Weeztix has withdrawn is cancelled with it, unless the
// person holds another valid ticket to the event: then the registration moves to that ticket.
const cancelWithdrawn = async (tx: Db, tickets: SavedTicket[]): Promise<void> => {
    const withdrawn = tickets.filter(ticket => !admits(ticket.status)).map(ticket => ticket.id);
    if (!withdrawn.length) return;
    const registrations = await tx.registration.findMany({
        where: { ticketId: { in: withdrawn }, status: { in: ['PENDING', 'CONFIRMED'] }, registrationSource: 'WEEZTIX' },
        select: { id: true, eventId: true, personId: true },
    });
    for (const registration of registrations) {
        const other = await otherAdmission(tx, registration, withdrawn);
        await tx.registration.update({ where: { id: registration.id }, data: other ? { ticketId: other.id } : { status: 'CANCELLED' } });
    }
};

// A ticket scanned at the door by a Weeztix scanner checks its registration in.
const checkInScanned = (tx: Db, tickets: SavedTicket[]) => tx.registration.updateMany({
    where: { ticketId: { in: tickets.filter(ticket => ticket.scanned).map(ticket => ticket.id) }, status: { in: ['PENDING', 'CONFIRMED'] } },
    data: { status: 'CHECKED_IN' },
});

// The buyer is registered once per event, however many tickets they bought. A registration made
// by hand is kept and only gets the ticket attached.
const registerBuyer = async (tx: Db, personId: string, eventId: string, tickets: SavedTicket[]): Promise<number> => {
    const admissible = tickets.filter(ticket => ticket.eventId === eventId && admits(ticket.status));
    if (!admissible.length) return 0;
    if (await tx.registration.count({ where: { ticketId: { in: admissible.map(ticket => ticket.id) } } })) return 0;
    const ticketId = admissible[0].id;
    const existing = await tx.registration.findUnique({ where: { eventId_personId: { eventId, personId } }, select: { id: true, ticketId: true, status: true, registrationSource: true } });
    if (!existing) {
        await tx.registration.create({ data: { eventId, personId, ticketId, status: 'CONFIRMED', registrationSource: 'WEEZTIX' } });
        return 1;
    }
    const revived = existing.status === 'CANCELLED' && existing.registrationSource === 'WEEZTIX';
    if (!existing.ticketId || revived) await tx.registration.update({ where: { id: existing.id }, data: { ticketId, ...(revived ? { status: 'CONFIRMED' as const } : {}) } });
    return 0;
};

interface OrderOutcome { created: boolean; tickets: number; registrations: number; withoutBuyer: boolean }

const syncOrder = async (tx: Db, context: SyncContext, order: WeeztixOrder): Promise<OrderOutcome> => {
    assertKnownTypes(order, context.lookup.types);
    const saved = await saveOrder(tx, context, order);
    const target = { orderId: saved.id, buyerId: saved.buyerId, lineIds: await saveLines(tx, context, saved.id, order) };
    const tickets: SavedTicket[] = [];
    for (const ticket of order.tickets) tickets.push(await saveTicket(tx, context, target, ticket));
    await savePayments(tx, saved, order);
    await cancelWithdrawn(tx, tickets);
    let registrations = 0;
    for (const eventId of new Set(tickets.map(ticket => ticket.eventId))) {
        if (saved.buyerId) registrations += await registerBuyer(tx, saved.buyerId, eventId, tickets);
    }
    await checkInScanned(tx, tickets);
    return { created: saved.created, tickets: tickets.length, registrations, withoutBuyer: !saved.buyerId };
};

// A person merged into another keeps the link; the order goes to the person they became.
const loadBuyers = async (connectionId: string): Promise<Map<string, string>> => {
    const links = await prisma.externalIdentity.findMany({ where: { providerConnectionId: connectionId, entityType: 'PERSON' }, select: { externalId: true, entityId: true } });
    const people = await prisma.person.findMany({ where: { id: { in: links.map(link => link.entityId) } }, select: { id: true, mergedIntoId: true } });
    const current = new Map(people.map(person => [person.id, person.mergedIntoId ?? person.id]));
    return new Map(links.flatMap((link): Array<[string, string]> => (current.has(link.entityId) ? [[link.externalId, current.get(link.entityId) as string]] : [])));
};

// Fingerprints of the orders already stored. An order without a buyer is not listed, so it is
// tried again on every run until its buyer can be found.
const loadStored = async (connectionId: string): Promise<Map<string, string>> => {
    const rows = await prisma.$queryRaw<Array<{ externalId: string; fingerprint: string | null }>>`
        SELECT "externalId", "rawData"->>'_fingerprint' AS fingerprint FROM "Order"
        WHERE "providerConnectionId" = ${connectionId}::uuid AND "buyerPersonId" IS NOT NULL AND "externalId" IS NOT NULL`;
    return new Map(rows.flatMap((row): Array<[string, string]> => (row.fingerprint ? [[row.externalId, row.fingerprint]] : [])));
};

const loadLookup = async (connectionId: string, shops: Map<string, string>): Promise<Lookup> => {
    const types = await prisma.ticketType.findMany({ where: { providerConnectionId: connectionId, externalId: { not: null } }, select: { externalId: true, eventId: true, name: true } });
    return { types: new Map(types.map(type => [type.externalId as string, { eventId: type.eventId, name: type.name }])), buyers: await loadBuyers(connectionId), stored: await loadStored(connectionId), shops };
};

const addOutcome = (result: OrderSyncResult, outcome: OrderOutcome): void => {
    result[outcome.created ? 'created' : 'updated'] += 1;
    result.tickets += outcome.tickets;
    result.registrations += outcome.registrations;
    result.withoutBuyer += outcome.withoutBuyer ? 1 : 0;
};

// Each order is saved on its own, so one broken order does not undo the others.
const syncEach = async (context: SyncContext, orders: WeeztixOrder[], result: OrderSyncResult): Promise<void> => {
    for (const order of orders) {
        if (context.lookup.stored.get(order.guid) === orderFingerprint(order, context.lookup.shops.get(order.shopGuid) ?? null)) {
            result.unchanged += 1;
            continue;
        }
        try {
            addOutcome(result, await prisma.$transaction(tx => syncOrder(tx, context, order), { timeout: 30_000 }));
        } catch (error) {
            result.failed += 1;
            result.firstError ??= (error instanceof Error ? error.message : 'Unknown error').slice(0, 300);
        }
    }
};

const finishRun = (runId: string, result: OrderSyncResult) => prisma.syncRun.update({
    where: { id: runId },
    data: {
        status: result.failed || result.unreadable ? 'FAILED' : 'SUCCEEDED', finishedAt: new Date(), errorSummary: result.firstError ?? unreadableNote(result.unreadable),
        createdCount: result.created, updatedCount: result.updated, skippedCount: result.unchanged, failedCount: result.failed + result.unreadable, metadata: { scope: 'ORDERS', tickets: result.tickets, registrations: result.registrations },
    },
});

const present = <Item>(item: Item | null): item is Item => item !== null;
const oldestFirst = (orders: WeeztixOrder[]): WeeztixOrder[] => [...orders].sort((a, b) => new Date(a.orderedAt).getTime() - new Date(b.orderedAt).getTime());

// When Weeztix returns orders and none of them can be read, the format has changed: nothing is
// saved. A few unreadable orders among readable ones are skipped and reported.
export const readOrders = (source: unknown[]): WeeztixOrder[] => {
    const orders = oldestFirst(source.map(toOrder).filter(present));
    if (source.length && !orders.length) throw new WeeztixFormatError('orders');
    return orders;
};

export const syncWeeztixOrders = async (connectionId: string): Promise<OrderSyncResult> => {
    const companyGuid = await readWeeztixCompanyGuid(connectionId);
    const access = { accessToken: await getWeeztixAccessToken(connectionId), companyGuid };
    const source = await fetchAllOrders(access);
    const shops = await fetchShopNames(access);
    const orders = readOrders(source);
    const people = await saveContactsFromOrders(connectionId, source);
    const result: OrderSyncResult = { orders: orders.length, created: 0, updated: 0, unchanged: 0, tickets: 0, registrations: 0, newPeople: people.created, withoutBuyer: 0, unreadable: source.length - orders.length, failed: 0, firstError: null };
    const run = await prisma.syncRun.create({ data: { providerConnectionId: connectionId, type: 'WEEZTIX_SYNC', metadata: { scope: 'ORDERS' } }, select: { id: true } });
    await syncEach({ connectionId, lookup: await loadLookup(connectionId, shops) }, orders, result);
    await finishRun(run.id, result);
    return result;
};

// How much of a failure is told in the chat.
const REASON_SHOWN = 200;
const running = new Set<string>();

// Sales need the catalog first: a ticket is stored under its ticket type and event. One sync per
// connection at a time: the schedule and the button must not write the same orders together.
export const syncWeeztixSales = async (connectionId: string): Promise<{ catalog: CatalogSyncResult; sales: OrderSyncResult }> => {
    if (running.has(connectionId)) throw new ApiError(409, 'WEEZTIX_SYNC_RUNNING', 'Weeztix is being synced right now. Try again in a minute');
    running.add(connectionId);
    const before = await prisma.providerConnection.findUnique({ where: { id: connectionId }, select: { name: true, lastError: true } });
    try {
        const catalog = await syncWeeztixCatalog(connectionId);
        const sales = await syncWeeztixOrders(connectionId);
        // Before the result is recorded: orders are stored by now, and a failure further down must not silence them.
        void announceNewSales(connectionId).catch((): number => 0);
        await recordWeeztixSync(connectionId, sales.firstError ?? unreadableNote(catalog.unreadable + sales.unreadable));
        return { catalog, sales };
    } catch (error) {
        const reason = (error instanceof Error ? error.message : 'Unknown error').slice(0, 300);
        await recordWeeztixSync(connectionId, reason);
        // A connection that already failed is retried on every sweep; only the first failure is announced.
        if (!before?.lastError) void announce('WEEZTIX_SYNC_FAILED', { connection: before?.name ?? connectionId, reason: reason.slice(0, REASON_SHOWN), link: crmLink('/settings/providers') });
        throw error;
    } finally {
        running.delete(connectionId);
    }
};
