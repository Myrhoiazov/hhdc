import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { WeeztixTicket } from '../../integrations/ticketing/weeztix/weeztix.orders';
import { admits, nextTicketStatus, orderFingerprint, planLines, readOrders } from './weeztix-orders.service';

const ticket = (overrides: Partial<WeeztixTicket> = {}): WeeztixTicket => ({
    guid: 't', typeGuid: 'full', number: 'N', status: 'VALID', price: '330.00', listPrice: '330.00', serviceFee: '0.79', couponCode: null, downloadUrl: null, raw: {}, ...overrides,
});
const types = new Map([['full', { eventId: 'e-1', name: 'Full Pass' }], ['day', { eventId: 'e-1', name: 'Day Pass' }]]);

test('tickets of one type make one line with the list price and what was actually paid', () => {
    const lines = planLines([ticket(), ticket({ price: '297.00', couponCode: 'TEN' }), ticket({ typeGuid: 'day', price: '120.10', listPrice: '120.10' })], types);
    assert.deepEqual(lines, [
        { typeGuid: 'full', name: 'Full Pass', quantity: 2, unitPrice: '330.00', totalPrice: '627.00' },
        { typeGuid: 'day', name: 'Day Pass', quantity: 1, unitPrice: '120.10', totalPrice: '120.10' },
    ]);
});

test('money is added in cents, so small amounts do not drift', () => {
    const lines = planLines([ticket({ price: '0.10' }), ticket({ price: '0.20' })], types);
    assert.equal(lines[0].totalPrice, '0.30');
});

test('a check-in recorded in the CRM survives a sync, a withdrawal in Weeztix does not', () => {
    assert.equal(nextTicketStatus('USED', 'VALID'), 'USED');
    assert.equal(nextTicketStatus('VALID', 'VALID'), 'VALID');
    assert.equal(nextTicketStatus('USED', 'REFUNDED'), 'REFUNDED');
    assert.equal(nextTicketStatus('VALID', 'TRANSFERRED'), 'TRANSFERRED');
});

test('only a valid or used ticket lets its holder in', () => {
    assert.deepEqual(['VALID', 'USED', 'CANCELLED', 'REFUNDED', 'TRANSFERRED'].map(status => admits(status as WeeztixTicket['status'])), [true, true, false, false, false]);
});

const source = (guid: string) => ({ guid, email: 'a@example.test', status: 'paid', created_at: `2026-0${guid}-01T10:00:00+02:00`, tickets: [] as unknown[], payments: [] as unknown[] });

test('orders are read oldest first, and a few unreadable ones are left out', () => {
    assert.deepEqual(readOrders([source('3'), { broken: true }, source('1')]).map(order => order.guid), ['1', '3']);
    assert.deepEqual(readOrders([]), []);
});

test('when no order of an answer can be read the format has changed and nothing is saved', () => {
    assert.throws(() => readOrders([{ id: 1 }, { id: 2 }]), /format the CRM does not know \(orders\)/);
});

test('an order that looks the same has the same fingerprint; a change in it or in its shop gives another', () => {
    const [order] = readOrders([source('1')]);
    assert.equal(orderFingerprint(order, 'Shop'), orderFingerprint(structuredClone(order), 'Shop'));
    assert.notEqual(orderFingerprint(order, 'Shop'), orderFingerprint({ ...order, status: 'CANCELLED' }, 'Shop'));
    assert.notEqual(orderFingerprint(order, 'Shop'), orderFingerprint(order, 'Other shop'));
    assert.match(orderFingerprint(order), /^[0-9a-f]{32}$/);
});
