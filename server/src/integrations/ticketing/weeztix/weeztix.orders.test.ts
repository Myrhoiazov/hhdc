import { test } from 'node:test';
import assert from 'node:assert/strict';
import { downloadUrl, toOrder, toPayment, toTicket } from './weeztix.orders';

const part = (overrides: Record<string, unknown> = {}) => ({ scanned_amount: 0, coupon_code: null as string | null, ...overrides });
const ticket = (overrides: Record<string, unknown> = {}) => ({
    guid: 't-1', ticket_id: 'type-1', ticket_number: 'ABC123', finn_value: 10000, finn_original_price: 12000,
    invalidated_since: null as string | null, invalidated_reason: null as string | null, products: [part({ coupon_code: 'EARLY' })], order: { email: 'x' }, ...overrides,
});
const payment = { guid: 'p-1', finn_price: 10260, currency: 'EUR', status: 'paid', updated_at: '2025-03-01T10:01:00+01:00', payment_method: { name: 'iDeal' } };
const order = (overrides: Record<string, unknown> = {}) => ({
    guid: 'o-1', email: ' Anna@Example.test ', status: 'paid', finn_value: 10000, finn_service_fee: 79, finn_price: 10079, created_at: '2025-03-01T10:00:00+01:00',
    invalidated_since: null as string | null, invalidated_reason: null as string | null, tickets: [ticket()], payments: [payment],
    tech_data: { purchaser_ip_address: '1.2.3.4' }, geoable: { latitude: 52 }, ...overrides,
});

test('a ticket keeps what was paid, the list price and the coupon that explains the difference', () => {
    const mapped = toTicket(ticket());
    assert.deepEqual({ ...mapped, raw: undefined }, { guid: 't-1', typeGuid: 'type-1', number: 'ABC123', status: 'VALID', price: '100.00', listPrice: '120.00', serviceFee: '0.00', couponCode: 'EARLY', downloadUrl: null, raw: undefined });
    assert.equal('order' in (mapped?.raw ?? {}), false);
    assert.equal(toTicket({ guid: 't-2' }), null);
});

test('a withdrawn ticket is refunded, transferred or cancelled by its reason; a fully scanned one is used', () => {
    const withdrawn = (reason: string) => toTicket(ticket({ invalidated_since: '2025-04-01', invalidated_reason: reason }))?.status;
    assert.equal(withdrawn('returned'), 'REFUNDED');
    assert.equal(withdrawn('ticket is ticketswapped'), 'TRANSFERRED');
    assert.equal(withdrawn('cancelled'), 'CANCELLED');
    assert.equal(toTicket(ticket({ products: [part({ scanned_amount: 1 }), part({ scanned_amount: 1 })] }))?.status, 'USED');
    assert.equal(toTicket(ticket({ products: [part({ scanned_amount: 1 }), part()] }))?.status, 'VALID');
});

test('a payment is the amount actually charged, with the method by name', () => {
    assert.deepEqual(toPayment(payment), { guid: 'p-1', amount: '102.60', currency: 'EUR', status: 'PAID', method: 'iDeal', paidAt: '2025-03-01T10:01:00+01:00' });
    assert.equal(toPayment({ ...payment, status: 'something new' })?.status, 'PENDING');
    assert.equal(toPayment({ ...payment, status: 'open' })?.paidAt, null);
});

test('an order carries amounts, its state and a copy of the answer without network and location details', () => {
    const mapped = toOrder(order());
    assert.equal(mapped?.email, 'anna@example.test');
    assert.deepEqual([mapped?.status, mapped?.subtotal, mapped?.fees, mapped?.total, mapped?.currency], ['PAID', '100.00', '0.79', '100.79', 'EUR']);
    assert.equal(mapped?.tickets.length, 1);
    assert.equal(mapped?.payments.length, 1);
    assert.deepEqual(Object.keys(mapped?.raw ?? {}).filter(key => ['tech_data', 'geoable'].includes(key)), []);
});

test('a returned order is refunded, a cancelled one cancelled, an unpaid one pending', () => {
    assert.equal(toOrder(order({ invalidated_since: '2025-04-01', invalidated_reason: 'returned' }))?.status, 'REFUNDED');
    assert.equal(toOrder(order({ invalidated_since: '2025-04-01', invalidated_reason: 'cancelled' }))?.status, 'CANCELLED');
    assert.equal(toOrder(order({ status: 'pending' }))?.status, 'PENDING');
    assert.equal(toOrder({ email: 'a@b.test' }), null);
});

test('an order with a ticket or payment the CRM cannot read is not stored in part', () => {
    assert.equal(toOrder(order({ tickets: [ticket(), { guid: 't-2' }] })), null);
    assert.equal(toOrder(order({ payments: [{ finn_price: 1 }] })), null);
});

test('the address of a ticket file is kept apart from the copy of the answer, and only when it is a real https address', () => {
    const mapped = toOrder(order({ download_link: 'https://example.test/o', tickets: [ticket({ pdf_location: 'x', download_link: 'https://example.test/t.pdf', finn_service_fee: 79 }), ticket({ guid: 't-2', download_link: '0' })] }));
    assert.equal(JSON.stringify(mapped?.raw).includes('example.test/'), false);
    assert.deepEqual([mapped?.downloadUrl, mapped?.tickets[0].downloadUrl, mapped?.tickets[1].downloadUrl, mapped?.tickets[0].serviceFee], ['https://example.test/o', 'https://example.test/t.pdf', null, '0.79']);
    assert.equal(downloadUrl('javascript:alert(1)'), null);
    assert.equal(downloadUrl('http://example.test/t.pdf'), null);
});

test('answers given at checkout are kept by the name of the question, unanswered ones are left out', () => {
    const answers = [{ value: '+31600000001', metadata: { name: 'phonenumber' } }, { value: 0, metadata: { name: 'keep_me_informed' } }, { value: '', metadata: { name: 'city' } }, { value: 'x' }];
    assert.deepEqual(toOrder(order({ meta_data: answers, shop_id: 's-1' }))?.answers, [{ name: 'phonenumber', value: '+31600000001' }, { name: 'keep_me_informed', value: '0' }]);
    assert.equal(toOrder(order({ shop_id: 's-1' }))?.shopGuid, 's-1');
});
