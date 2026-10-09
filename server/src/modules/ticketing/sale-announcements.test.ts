import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOTIFICATIONS } from '../telegram-notifications/settings';
import { renderTemplate } from '../telegram-notifications/templates';
import { moreOrdersLine, saleValues, ticketsLine, untoldOrders, type SoldOrder } from './sale-announcements';

const env = { CLIENT_URL: 'https://crm.example.test' } as NodeJS.ProcessEnv;
const order = (overrides: Partial<SoldOrder> = {}): SoldOrder => ({
    subtotal: { toFixed: () => '585.00' }, currency: 'EUR', event: { name: 'Dance Camp' },
    buyer: { id: 'p1', displayName: 'Anna Berg', email: 'anna@example.test', country: 'Nederland' },
    items: [{ name: 'Day Pass', quantity: 1 }, { name: 'Full Pass', quantity: 2 }], ...overrides,
});
const template = (NOTIFICATIONS.find(item => item.key === 'NEW_TICKET_SALES') as typeof NOTIFICATIONS[number]).defaultTemplate;

test('ticket types of an order are listed with how many of each were bought', () => {
    assert.equal(ticketsLine(order().items), '1 × Day Pass, 2 × Full Pass');
});

test('a new order tells the tickets, the event, the buyer and links to the buyer in the CRM', () => {
    assert.deepEqual(saleValues(order(), env), {
        tickets: '1 × Day Pass, 2 × Full Pass', event: 'Dance Camp', name: 'Anna Berg', email: 'anna@example.test', country: 'Nederland',
        amount: '585.00', currency: 'EUR', link: 'https://crm.example.test/people/p1',
    });
});

test('the first text of the notification shows every detail of the order', () => {
    assert.equal(renderTemplate(template, saleValues(order(), env)), [
        '🎟 New ticket order', '1 × Day Pass, 2 × Full Pass', 'Event: Dance Camp', 'Buyer: Anna Berg', 'Email: anna@example.test', 'Country: Nederland',
        'Amount: 585.00 EUR', 'https://crm.example.test/people/p1',
    ].join('\n'));
});

test('an order without a buyer or a country leaves those lines out and links to the events', () => {
    const text = renderTemplate(template, saleValues(order({ buyer: null }), env));
    assert.doesNotMatch(text, /Buyer|Email|Country/);
    assert.match(text, /https:\/\/crm\.example\.test\/events$/);
    assert.doesNotMatch(renderTemplate(template, saleValues(order({ buyer: { id: 'p1', displayName: 'Anna Berg', email: 'anna@example.test', country: null } }), env)), /Country/);
});

test('orders beyond the first few are only counted', () => {
    assert.equal(moreOrdersLine(1438), '🎟 …and 1438 more new orders');
});

test('an order is news once: paid, with a buyer, placed within the last day and not told yet', () => {
    const where = untoldOrders('c1', new Date('2026-10-09T12:00:00Z'));
    assert.deepEqual(where, {
        providerConnectionId: 'c1', announcedAt: null, status: 'PAID', buyerPersonId: { not: null }, orderedAt: { gte: new Date('2026-10-08T12:00:00Z') },
    });
});
