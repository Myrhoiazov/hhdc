import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contactDeletedMessage, expenseAddedMessage, newSalesMessage, refundRequestedMessage, weeztixFailedMessage } from './messages';
import { NOTIFICATION_GROUPS, NOTIFICATION_KEYS } from './notifications.types';
import { isTelegramConfigured, notificationChangeSchema, notificationKeySchema, NOTIFICATIONS, toSettingView } from './settings';

const env = (values: Record<string, string>) => values as NodeJS.ProcessEnv;
const crm = env({ CLIENT_URL: 'https://crm.example.test/' });

test('every notification has its own key and belongs to a known group', () => {
    const keys = NOTIFICATIONS.map(definition => definition.key);
    assert.deepEqual([...keys].sort(), [...NOTIFICATION_KEYS].sort());
    for (const definition of NOTIFICATIONS) assert.ok(NOTIFICATION_GROUPS.includes(definition.group));
});

test('a switch nobody touched shows its default and nobody as its author', () => {
    const [sales] = NOTIFICATIONS;
    assert.deepEqual(toSettingView(sales, undefined, true), { key: 'NEW_TICKET_SALES', group: 'SALES', title: 'New ticket sales', enabled: true, configured: true, updatedAt: null, updatedBy: null });
});

test('a stored switch wins over the default and names who changed it', () => {
    const updatedBy = { id: 'u1', name: 'Olga', email: 'olga@example.test' };
    const updatedAt = new Date('2026-10-08T10:00:00Z');
    const view = toSettingView(NOTIFICATIONS[0], { key: 'NEW_TICKET_SALES', enabled: false, updatedAt, updatedBy }, false);
    assert.deepEqual([view.enabled, view.configured, view.updatedAt, view.updatedBy], [false, false, updatedAt, updatedBy]);
});

test('Telegram counts as set up only with a token and a numeric chat', () => {
    assert.equal(isTelegramConfigured(env({ TELEGRAM_TOKEN: 't', TELEGRAM_EMAIL_NOTIFY_CHAT_ID: '-1001' })), true);
    assert.equal(isTelegramConfigured(env({ TELEGRAM_TOKEN: 't', TELEGRAM_EMAIL_NOTIFY_CHAT_ID: 'my-chat' })), false);
    assert.equal(isTelegramConfigured(env({ TELEGRAM_EMAIL_NOTIFY_CHAT_ID: '-1001' })), false);
});

test('an unknown notification and a switch that is not a boolean are refused', () => {
    assert.equal(notificationKeySchema.parse('NEW_EMAIL'), 'NEW_EMAIL');
    assert.throws(() => notificationKeySchema.parse('NEW_STUDENT'));
    assert.throws(() => notificationChangeSchema.parse({ enabled: 'yes' }));
    assert.throws(() => notificationChangeSchema.parse({ enabled: true, key: 'NEW_EMAIL' }));
});

test('messages link to the CRM and say what happened in numbers', () => {
    assert.equal(newSalesMessage(3, crm), '🎟 New ticket orders: 3\nhttps://crm.example.test/events');
    assert.equal(refundRequestedMessage('120.00', 'EUR', crm), '↩️ Refund requested: 120.00 EUR\nhttps://crm.example.test/finance');
    assert.match(expenseAddedMessage({ category: 'VENUE', amount: '900.00', currency: 'EUR', eventName: 'Dance Camp' }, crm), /VENUE 900\.00 EUR\nEvent: Dance Camp/);
    assert.equal(newSalesMessage(1, env({})), '🎟 New ticket orders: 1');
});

test('messages never carry the details of a person, and a long failure reason is cut', () => {
    assert.doesNotMatch(contactDeletedMessage('Olga', crm), /@|\+\d/);
    assert.ok(weeztixFailedMessage('Weeztix', 'x'.repeat(500), env({})).length < 280);
});
