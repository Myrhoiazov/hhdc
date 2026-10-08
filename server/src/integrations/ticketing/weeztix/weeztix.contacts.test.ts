import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectContacts, fetchAllOrders, toBuyer } from './weeztix.contacts';

const answer = (name: string, value: unknown) => ({ value, metadata: { name } });

const order = (overrides: Record<string, unknown> = {}) => ({
    guid: 'o-1', email: ' Anna@Example.test ', firstName: ' Anna ', lastName: 'Berg', locale: 'de_DE', created_at: '2025-03-01T10:00:00+01:00',
    meta_data: [answer('phonenumber', '+31600000001'), answer('country', 'Nederland'), answer('keep_me_informed', '1')],
    ...overrides,
});

test('an order becomes a buyer with a normalised email and the answers given at checkout', () => {
    assert.deepEqual(toBuyer(order()), {
        orderGuid: 'o-1', email: 'anna@example.test', firstName: 'Anna', lastName: 'Berg', language: 'de',
        phone: '+31600000001', country: 'Nederland', marketing: true, orderedAt: '2025-03-01T10:00:00+01:00',
    });
});

test('missing answers stay empty and an unanswered newsletter question is not a refusal', () => {
    const buyer = toBuyer(order({ meta_data: [{ value: "x", metadata: {} }], locale: null }));
    assert.equal(buyer?.phone, '');
    assert.equal(buyer?.country, '');
    assert.equal(buyer?.language, '');
    assert.equal(buyer?.marketing, null);
    assert.equal(toBuyer(order({ meta_data: [answer('keep_me_informed', 0)] }))?.marketing, false);
});

test('an order without a usable email is not a contact', () => {
    assert.equal(toBuyer(order({ email: 'not-an-address' })), null);
    assert.equal(toBuyer(order({ email: null })), null);
    assert.equal(toBuyer(null), null);
});

test('orders of one email become one contact: newest details, earliest date, any consent given', () => {
    const contacts = collectContacts([
        order({ guid: 'o-2', created_at: '2026-01-01T10:00:00+01:00', firstName: 'Anna-Maria', meta_data: [answer('keep_me_informed', '0')] }),
        order(),
        order({ guid: 'o-3', email: 'other@example.test' }),
        order({ guid: 'o-4', email: '' }),
    ]);
    assert.equal(contacts.length, 2);
    const anna = contacts.find(contact => contact.email === 'anna@example.test');
    assert.deepEqual(anna, {
        email: 'anna@example.test', firstName: 'Anna-Maria', lastName: 'Berg', language: 'de', phone: '+31600000001', country: 'Nederland',
        marketing: true, marketingAt: '2025-03-01T10:00:00+01:00', firstOrderAt: '2025-03-01T10:00:00+01:00', orderGuids: ['o-1', 'o-2'],
    });
});

const page = (guids: string[], total: number) => new Response(JSON.stringify({ hits: { total, hits: guids.map(guid => ({ _source: { guid } })) } }));

test('all orders are read page by page with the company header, and the token is not put in the address', async () => {
    const calls: Array<{ url: string; headers: Record<string, string>; body: unknown }> = [];
    const fetchImpl = (async (url: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(url), headers: { ...(init?.headers as Record<string, string>) }, body: JSON.parse(String(init?.body)) });
        return calls.length === 1 ? page(['a', 'b'], 3) : page(['c'], 3);
    }) as typeof fetch;
    const orders = await fetchAllOrders({ accessToken: 'token', companyGuid: 'company' }, { pageSize: 2, fetchImpl });
    assert.deepEqual(orders, [{ guid: 'a' }, { guid: 'b' }, { guid: 'c' }]);
    assert.deepEqual(calls.map(call => call.body), [{ search: '', limit: 2, offset: 0 }, { search: '', limit: 2, offset: 2 }]);
    assert.equal(calls[0].headers.Company, 'company');
    assert.equal(calls[0].headers.Authorization, 'Bearer token');
    assert.ok(!calls[0].url.includes('token'));
});

test('a refusal from Weeztix stops the import instead of returning a partial list', async () => {
    const fetchImpl = (async () => new Response(JSON.stringify({ error_description: 'Sorry' }), { status: 500 })) as typeof fetch;
    await assert.rejects(fetchAllOrders({ accessToken: 't', companyGuid: 'c' }, { fetchImpl }), /Weeztix did not return orders: Sorry/);
});

test('an empty page ends the reading even when the total claims more', async () => {
    let calls = 0;
    const fetchImpl = (async () => { calls += 1; return calls === 1 ? page(['a'], 10) : page([], 10); }) as typeof fetch;
    assert.equal((await fetchAllOrders({ accessToken: 't', companyGuid: 'c' }, { pageSize: 1, fetchImpl })).length, 1);
});

test('an order list in an unknown shape is refused instead of being read as "no orders"', async () => {
    const fetchImpl = (async () => new Response(JSON.stringify({ data: [] }))) as typeof fetch;
    await assert.rejects(fetchAllOrders({ accessToken: 't', companyGuid: 'c' }, { fetchImpl }), /format the CRM does not know \(orders\)/);
});
