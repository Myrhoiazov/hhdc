import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCrmContext } from './crm-context';

test('CRM context carries statuses and amounts of the customer records, nothing internal', () => {
    const context = toCrmContext({
        orders: [{ externalId: 'WC-1001', status: 'PAID', currency: 'EUR', total: '390.00', orderedAt: new Date('2026-10-01T09:00:00Z'), event: { name: 'HHDC 2027' } }],
        tickets: [{ ticketType: 'TICKET [FULL PASS] 13 CLASSES', status: 'VALID', event: { name: 'HHDC 2027' } }],
        payments: [{ amount: '390.00', currency: 'EUR', status: 'PAID', method: 'ideal', paidAt: new Date('2026-10-01T09:05:00Z'), refunds: [] }],
        registrations: [{ status: 'CONFIRMED', event: { name: 'HHDC 2027' } }],
    });

    assert.equal(context.found, true);
    const data = JSON.parse(context.text);
    assert.deepEqual(data.orders, [{ orderReference: 'WC-1001', event: 'HHDC 2027', orderStatus: 'PAID', total: '390.00 EUR', createdAt: '2026-10-01' }]);
    assert.equal(data.payments[0].paymentStatus, 'PAID');
    assert.equal(data.registrations[0].registrationStatus, 'CONFIRMED');
    assert.doesNotMatch(context.text, /"id"|personId|notes/);
});

test('a customer without any record yields an empty context', () => {
    assert.deepEqual(toCrmContext({ orders: [], tickets: [], payments: [], registrations: [] }), { found: false, text: '' });
});
