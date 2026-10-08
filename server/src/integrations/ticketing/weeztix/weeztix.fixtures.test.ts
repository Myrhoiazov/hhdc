import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetchCatalog, fetchCoupons } from './weeztix.catalog';
import { collectContacts, fetchAllOrders } from './weeztix.contacts';
import { toOrder, type WeeztixOrder } from './weeztix.orders';

// Answers of the real Weeztix API, saved once and stripped of personal data (see fixtures/README.md).
// They pin down the shapes the integration depends on: when Weeztix changes one of them, refresh
// the fixtures and these tests show what broke.

const fixture = (name: string): unknown => JSON.parse(readFileSync(join(__dirname, 'fixtures', `${name}.json`), 'utf8'));
const byGuid = (name: string) => fixture(name) as Record<string, unknown>;
const access = { accessToken: 'token', companyGuid: 'company' };

const weeztix = (async (url: unknown, init?: RequestInit) => {
    const path = String(url).replace('https://api.weeztix.com/', '');
    const [resource, guid, part] = path.split('/');
    const answers: Record<string, () => unknown> = {
        'statistics:search': () => (JSON.parse(String(init?.body)).offset ? { hits: { total: 0, hits: [] } } : fixture('orders-search')),
        'event:': () => fixture('events'), 'event:ticket': () => byGuid('ticket-types')[guid],
        'coupon:': () => fixture('coupons'), 'coupon:codes': () => byGuid('coupon-codes')[guid],
    };
    const answer = (answers[resource === 'statistics' ? 'statistics:search' : `${resource}:${part ?? ''}`] ?? (() => undefined))();
    return new Response(JSON.stringify(answer ?? { error_description: `no fixture for ${path}` }), { status: answer === undefined ? 404 : 200 });
}) as typeof fetch;

const readOrders = async (): Promise<{ source: unknown[]; orders: WeeztixOrder[] }> => {
    const source = await fetchAllOrders(access, { fetchImpl: weeztix });
    return { source, orders: source.map(toOrder).filter((order): order is WeeztixOrder => order !== null) };
};

test('every event, ticket type and coupon of a real answer is understood', async () => {
    const catalog = await fetchCatalog(access, weeztix);
    const coupons = await fetchCoupons(access, weeztix);
    assert.deepEqual([catalog.items.length, catalog.unreadable, coupons.items.length, coupons.unreadable], [5, 0, 3, 0]);
    assert.ok(catalog.items.every(event => event.ticketTypes.length > 0 && event.venueName && !Number.isNaN(new Date(event.startAt).getTime())));
    assert.ok(catalog.items.flatMap(event => event.ticketTypes).every(type => /^\d+\.\d{2}$/.test(type.price)));
    assert.ok(coupons.items.every(coupon => coupon.codes.length > 0 && /^\d+\.\d{2}$/.test(coupon.amount)));
});

test('every order of a real answer is understood, with each kind of withdrawal', async () => {
    const { source, orders } = await readOrders();
    assert.equal(orders.length, source.length);
    assert.deepEqual([...new Set(orders.map(order => order.status))].sort(), ['CANCELLED', 'PAID', 'REFUNDED']);
    assert.deepEqual([...new Set(orders.flatMap(order => order.tickets.map(ticket => ticket.status)))].sort(), ['CANCELLED', 'REFUNDED', 'TRANSFERRED', 'VALID']);
});

test('money of a real order adds up: tickets plus the service fee make the total', async () => {
    const { orders } = await readOrders();
    const cents = (amount: string) => Math.round(Number(amount) * 100);
    for (const order of orders) assert.equal(cents(order.subtotal) + cents(order.fees), cents(order.total), order.guid);
    const discounted = orders.flatMap(order => order.tickets).filter(ticket => ticket.couponCode);
    assert.ok(discounted.length > 0 && discounted.every(ticket => cents(ticket.price) < cents(ticket.listPrice)));
});

test('every sold ticket belongs to a ticket type of the catalog, and its coupon code to a coupon', async () => {
    const { orders } = await readOrders();
    const types = new Set((await fetchCatalog(access, weeztix)).items.flatMap(event => event.ticketTypes.map(type => type.guid)));
    const codes = new Set((await fetchCoupons(access, weeztix)).items.flatMap(coupon => coupon.codes));
    const tickets = orders.flatMap(order => order.tickets);
    assert.ok(tickets.every(ticket => types.has(ticket.typeGuid)));
    assert.ok(tickets.every(ticket => !ticket.couponCode || codes.has(ticket.couponCode)));
});

test('buyers of real orders become contacts with phone, country and the newsletter answer', async () => {
    const { source } = await readOrders();
    const contacts = collectContacts(source);
    assert.equal(contacts.length, source.length);
    assert.ok(contacts.every(contact => contact.email.endsWith('@example.test') && contact.firstName && contact.lastName && contact.language.length === 2));
    assert.ok(contacts.some(contact => contact.phone && contact.country));
    assert.ok(contacts.some(contact => contact.marketing) && contacts.some(contact => !contact.marketing));
});

test('what is stored next to an order carries no network, location or ticket file details', async () => {
    const stored = JSON.stringify((await readOrders()).orders.map(order => order.raw));
    for (const field of ['tech_data', 'geoable', 'purchaser_ip_address', 'download_link', 'pdf_location']) assert.equal(stored.includes(`"${field}"`), false, field);
});
