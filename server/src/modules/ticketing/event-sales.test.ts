import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summariseSales, type SoldTicket } from './event-sales';

const ticket = (overrides: Partial<SoldTicket> = {}): SoldTicket => ({
    status: 'VALID', ticketType: 'Full Pass', price: '330.00', listPrice: '330.00', couponCode: null, orderId: 'o-1', buyerId: 'p-1', orderedAt: new Date('2026-05-20T10:00:00Z'), ...overrides,
});

test('an event without sales is all zeros', () => {
    assert.deepEqual(summariseSales([]), { currency: 'EUR', tickets: 0, withdrawn: 0, orders: 0, buyers: 0, revenue: '0.00', discount: '0.00', byType: [], byMonth: [], coupons: [] });
});

test('only tickets that let the holder in are sold; the rest are counted apart and earn nothing', () => {
    const sales = summariseSales([ticket(), ticket({ status: 'USED', orderId: 'o-2', buyerId: 'p-2' }), ticket({ status: 'REFUNDED', orderId: 'o-3', buyerId: 'p-3' }), ticket({ status: 'CANCELLED', orderId: 'o-4' })]);
    assert.deepEqual([sales.tickets, sales.withdrawn, sales.orders, sales.buyers, sales.revenue], [2, 2, 2, 2, '660.00']);
});

test('sales are split by ticket type, most sold first, and by the month of the order', () => {
    const sales = summariseSales([
        ticket({ ticketType: 'Day Pass', price: '120.00', listPrice: '120.00' }),
        ticket({ orderedAt: new Date('2026-06-02T10:00:00Z') }), ticket({ orderedAt: new Date('2026-06-15T10:00:00Z') }),
    ]);
    assert.deepEqual(sales.byType, [{ name: 'Full Pass', tickets: 2, revenue: '660.00' }, { name: 'Day Pass', tickets: 1, revenue: '120.00' }]);
    assert.deepEqual(sales.byMonth, [{ name: '2026-05', tickets: 1, revenue: '120.00' }, { name: '2026-06', tickets: 2, revenue: '660.00' }]);
});

test('a discount is the list price minus what was paid, grouped by the coupon behind the code', () => {
    const names = new Map([['EARLY-1', 'Early bird'], ['EARLY-2', 'Early bird']]);
    const sales = summariseSales([
        ticket({ price: '290.00', couponCode: 'EARLY-1' }), ticket({ price: '290.00', couponCode: 'EARLY-2' }),
        ticket({ price: '0.00', couponCode: 'CREW' }), ticket(),
    ], names);
    assert.equal(sales.discount, '410.00');
    assert.deepEqual(sales.coupons, [{ name: 'Early bird', tickets: 2, discount: '80.00' }, { name: 'CREW', tickets: 1, discount: '330.00' }]);
});

test('a ticket synced before prices were stored counts as a ticket without an amount', () => {
    const sales = summariseSales([ticket({ price: null, listPrice: null })]);
    assert.deepEqual([sales.tickets, sales.revenue, sales.discount], [1, '0.00', '0.00']);
});
