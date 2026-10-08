import { test } from 'node:test';
import assert from 'node:assert/strict';
import { centsToAmount, fetchCatalog, fetchCoupons, toCatalogEvent, toCoupon, toTicketType } from './weeztix.catalog';

const ticket = { guid: 't-1', name: ' Full Pass ', description: null as string | null, min_price: 33000, vat_percentage: 9, status: 'available', available_from: '2026-05-17T20:00:00+02:00', available_until: null as string | null, sold_count: 112 };
const event = { guid: 'e-1', name: 'HHDC 2027', description: 'Camp', start: '2027-05-21T01:00:00+02:00', end: '2027-05-23T23:00:00+02:00', currency: 'EUR', capacity: 0, location: { name: 'Studio', address: 'Street 1, Amsterdam' } };

test('prices arrive in cents and are stored as amounts', () => {
    assert.equal(centsToAmount(33000), '330.00');
    assert.equal(centsToAmount(1999), '19.99');
    assert.equal(centsToAmount(null), '0.00');
});

test('a ticket type keeps its price, sales period and the original answer', () => {
    assert.deepEqual(toTicketType(ticket), {
        guid: 't-1', name: 'Full Pass', description: null, price: '330.00', vatPercentage: 9, status: 'available',
        availableFrom: '2026-05-17T20:00:00+02:00', availableUntil: null, soldCount: 112, raw: ticket,
    });
    assert.equal(toTicketType({ name: 'No id' }), null);
});

test('an event takes its venue from the location, and no limit means no capacity', () => {
    const mapped = toCatalogEvent(event, [ticket, { broken: true }]);
    assert.equal(mapped?.venueName, 'Studio');
    assert.equal(mapped?.address, 'Street 1, Amsterdam');
    assert.equal(mapped?.capacity, null);
    assert.equal(mapped?.ticketTypes.length, 1);
    assert.equal(toCatalogEvent({ ...event, capacity: 400 })?.capacity, 400);
    assert.equal(toCatalogEvent({ ...event, start: '' }), null);
});

const answering = (answers: Record<string, unknown>, seen: string[] = []) => (async (url: unknown) => {
    seen.push(String(url));
    const body = answers[String(url).replace('https://api.weeztix.com/', '')];
    return new Response(JSON.stringify(body ?? { error_description: 'Nope' }), { status: body ? 200 : 500 });
}) as typeof fetch;

test('the catalog is every event with the ticket types asked for that event', async () => {
    const seen: string[] = [];
    const catalog = await fetchCatalog({ accessToken: 'token', companyGuid: 'c' }, answering({ event: [event, { name: 'no guid' }], 'event/e-1/ticket': [ticket] }, seen));
    assert.deepEqual(catalog.items.map(item => [item.guid, item.ticketTypes.map(type => type.price)]), [['e-1', ['330.00']]]);
    assert.equal(catalog.unreadable, 1);
    assert.deepEqual(seen, ['https://api.weeztix.com/event', 'https://api.weeztix.com/event/e-1/ticket']);
});

test('a refusal stops the reading instead of returning half a catalog', async () => {
    await assert.rejects(fetchCatalog({ accessToken: 't', companyGuid: 'c' }, answering({ event: [event] })), /Weeztix did not return event data: Nope/);
});

const coupon = { guid: 'c-1', name: 'Early bird', description: null as string | null, type: 'fixed-discount', amount: 4000, status: 'enabled', start_date: '2025-01-05T19:00:00+01:00', end_date: null as string | null };

test('a fixed coupon is money, a percentage coupon is percents, and both keep their codes', () => {
    const mapped = toCoupon(coupon, [{ code: ' EARLY40 ' }, { code: '' }, {}]);
    assert.deepEqual([mapped?.amount, mapped?.codes, mapped?.startsAt, mapped?.endsAt], ['40.00', ['EARLY40'], '2025-01-05T19:00:00+01:00', null]);
    assert.equal(toCoupon({ ...coupon, type: 'percentage-discount', amount: 50 })?.amount, '50.00');
    assert.equal(toCoupon({ name: 'No id' }), null);
});

test('coupons are read with the codes asked for each of them', async () => {
    const seen: string[] = [];
    const coupons = await fetchCoupons({ accessToken: 't', companyGuid: 'c' }, answering({ coupon: [coupon], 'coupon/c-1/codes': [{ code: 'EARLY40' }] }, seen));
    assert.deepEqual(coupons.items.map(item => [item.name, item.codes]), [['Early bird', ['EARLY40']]]);
    assert.equal(coupons.unreadable, 0);
    assert.deepEqual(seen, ['https://api.weeztix.com/coupon', 'https://api.weeztix.com/coupon/c-1/codes']);
});

test('an answer that is not a list, or a retired endpoint, is refused as a changed format', async () => {
    await assert.rejects(fetchCatalog({ accessToken: 't', companyGuid: 'c' }, answering({ event: { data: [event] } })), /format the CRM does not know \(event data\)/);
    const retired = (async () => new Response('[]', { status: 299 })) as typeof fetch;
    await assert.rejects(fetchCoupons({ accessToken: 't', companyGuid: 'c' }, retired), /the endpoint is retired/);
});
