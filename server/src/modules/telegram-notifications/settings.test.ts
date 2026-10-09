import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crmLink } from './crm-link';
import { NOTIFICATION_GROUPS, NOTIFICATION_KEYS } from './notifications.types';
import { isTelegramConfigured, notificationChangeSchema, notificationKeySchema, NOTIFICATIONS, templateToStore, toSettingView } from './settings';
import { exampleValues, fitMessage, MESSAGE_MAX, renderTemplate, unknownPlaceholders, usedPlaceholders } from './templates';

const env = (values: Record<string, string>) => values as NodeJS.ProcessEnv;
const [sales] = NOTIFICATIONS;
const definition = (key: string) => NOTIFICATIONS.find(item => item.key === key) as typeof NOTIFICATIONS[number];

test('every notification has its own key, a known group and a first text that uses only its own values', () => {
    assert.deepEqual(NOTIFICATIONS.map(item => item.key).sort(), [...NOTIFICATION_KEYS].sort());
    for (const item of NOTIFICATIONS) {
        assert.ok(NOTIFICATION_GROUPS.includes(item.group));
        assert.deepEqual(unknownPlaceholders(item.defaultTemplate, item.placeholders), [], item.key);
    }
});

test('a notification nobody touched shows its default switch and its first text', () => {
    const view = toSettingView(sales, undefined, true);
    assert.deepEqual([view.enabled, view.template, view.customised, view.updatedAt, view.updatedBy], [true, sales.defaultTemplate, false, null, null]);
    assert.deepEqual(view.placeholders.map(placeholder => placeholder.name), ['tickets', 'event', 'name', 'email', 'country', 'amount', 'currency', 'link']);
});

test('a stored switch and a stored text win over the defaults and name who changed them', () => {
    const updatedBy = { id: 'u1', name: 'Olga', email: 'olga@example.test' };
    const updatedAt = new Date('2026-10-08T10:00:00Z');
    const view = toSettingView(sales, { key: 'NEW_TICKET_SALES', enabled: false, template: 'Продано: {{tickets}}', updatedAt, updatedBy }, false);
    assert.deepEqual([view.enabled, view.template, view.customised, view.configured, view.updatedBy], [false, 'Продано: {{tickets}}', true, false, updatedBy]);
    assert.equal(view.defaultTemplate, sales.defaultTemplate);
});

test('placeholders are filled with the values of the event', () => {
    assert.equal(renderTemplate('🎟 Новых заказов: {{orders}}\n{{ link }}', { orders: 3, link: 'https://crm.example.test/events' }), '🎟 Новых заказов: 3\nhttps://crm.example.test/events');
});

test('a line left empty by a missing value is dropped, an empty line of the text is kept', () => {
    assert.equal(renderTemplate('Заказы: {{orders}}\n\nПодробнее:\n{{link}}', { orders: 1, link: '' }), 'Заказы: 1\n\nПодробнее:');
    assert.equal(renderTemplate('Билеты: {{tickets}}\nСтрана: {{country}}\nСумма: {{amount}} {{currency}}', { tickets: '1 × Full Pass', country: ' ', amount: '', currency: 'EUR' }), 'Билеты: 1 × Full Pass\nСумма:  EUR');
    assert.equal(renderTemplate('⚠️ Sync failed\n{{link}}', { link: '' }), '⚠️ Sync failed');
});

test('a text may use only the values its notification has', () => {
    assert.deepEqual(usedPlaceholders('{{orders}} {{orders}} {{link}}'), ['orders', 'link']);
    assert.equal(templateToStore(sales, 'Билеты: {{tickets}}'), 'Билеты: {{tickets}}');
    assert.throws(() => templateToStore(sales, 'Купил {{buyerName}}, заказов {{orders}}'), /\{\{buyerName\}\}, \{\{orders\}\}/);
});

test('an empty text or the first text itself is not stored, so later changes of the first text apply', () => {
    assert.equal(templateToStore(sales, null), null);
    assert.equal(templateToStore(sales, ''), null);
    assert.equal(templateToStore(sales, sales.defaultTemplate), null);
});

test('only the message about a new order names the buyer; no other message carries details of a customer', () => {
    const personal = (item: typeof NOTIFICATIONS[number]) => item.placeholders.map(placeholder => placeholder.name).filter(name => /^(name|email|phone|country)$/.test(name));
    assert.deepEqual(NOTIFICATIONS.filter(item => personal(item).length).map(item => item.key), ['NEW_TICKET_SALES']);
    assert.deepEqual(personal(sales), ['name', 'email', 'country']);
    assert.deepEqual(definition('NEW_EMAIL').placeholders.map(placeholder => placeholder.name), ['link']);
});

test('a test message is the text filled with the examples', () => {
    const expense = definition('EVENT_EXPENSE_ADDED');
    assert.equal(renderTemplate(expense.defaultTemplate, exampleValues(expense.placeholders)), '💸 Expense added: VENUE 900.00 EUR\nEvent: High Heels Dance Camp\nhttps://crm.example.com/finance');
});

test('a change must name a switch or a text, and nothing else', () => {
    assert.deepEqual(notificationChangeSchema.parse({ enabled: false }), { enabled: false });
    assert.deepEqual(notificationChangeSchema.parse({ template: '  Билеты: {{tickets}} ' }), { template: 'Билеты: {{tickets}}' });
    assert.deepEqual(notificationChangeSchema.parse({ template: null }), { template: null });
    assert.throws(() => notificationChangeSchema.parse({}));
    assert.throws(() => notificationChangeSchema.parse({ enabled: 'yes' }));
    assert.throws(() => notificationChangeSchema.parse({ template: 'x'.repeat(2001) }));
    assert.throws(() => notificationChangeSchema.parse({ enabled: true, key: 'NEW_EMAIL' }));
    assert.equal(notificationKeySchema.parse('NEW_EMAIL'), 'NEW_EMAIL');
    assert.throws(() => notificationKeySchema.parse('NEW_STUDENT'));
});

test('Telegram counts as set up only with a token and a numeric chat', () => {
    assert.equal(isTelegramConfigured(env({ TELEGRAM_TOKEN: 't', TELEGRAM_EMAIL_NOTIFY_CHAT_ID: '-1001' })), true);
    assert.equal(isTelegramConfigured(env({ TELEGRAM_TOKEN: 't', TELEGRAM_EMAIL_NOTIFY_CHAT_ID: 'my-chat' })), false);
    assert.equal(isTelegramConfigured(env({ TELEGRAM_EMAIL_NOTIFY_CHAT_ID: '-1001' })), false);
});

test('a link into the CRM is empty until the address of the CRM is known', () => {
    assert.equal(crmLink('/finance', env({ CLIENT_URL: 'https://crm.example.test/' })), 'https://crm.example.test/finance');
    assert.equal(crmLink('/finance', env({})), '');
});

test('a message made too long by its values is cut to what Telegram accepts and marked', () => {
    const long = fitMessage(renderTemplate('Reason: {{reason}}', { reason: 'x'.repeat(6000) }));
    assert.equal(long.length, MESSAGE_MAX);
    assert.ok(long.endsWith('…'));
    assert.equal(fitMessage('short'), 'short');
});

test('a value that looks like a placeholder is sent as it is, not filled again', () => {
    assert.equal(renderTemplate('{{name}} / {{email}}', { name: '{{email}}', email: 'anna@example.test' }), '{{email}} / anna@example.test');
});
