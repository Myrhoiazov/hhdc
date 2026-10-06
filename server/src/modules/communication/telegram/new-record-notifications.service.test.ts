import assert from 'node:assert/strict';
import test, { afterEach, beforeEach, mock } from 'node:test';
import axios from 'axios';
import {
    buildNewMollieCustomerNotification,
    buildNewMollieCustomersSummaryNotification,
    buildNewStudentNotification,
    notifyNewMollieCustomers,
    notifyNewStudent,
    type NewMollieCustomerNotification,
} from './new-record-notifications.service';
import { telegramNotificationSettingsRepository } from './notification-settings.service';
import type { StoredTelegramNotificationSetting } from './notification-settings.types';

const envNames = ['TELEGRAM_TOKEN', 'TELEGRAM_CHAT_ID', 'CLIENT_URL'];
let previousEnv: Record<string, string | undefined> = {};
// null = no stored row: both notifications are switched off by default.
let storedEnabled: boolean | null = null;

beforeEach(() => {
    storedEnabled = null;
    previousEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
    process.env.TELEGRAM_TOKEN = 'token';
    process.env.TELEGRAM_CHAT_ID = 'chat-id';
    process.env.CLIENT_URL = 'https://crm.example.test/';
    mock.method(telegramNotificationSettingsRepository, 'findByKey', async (key: string): Promise<StoredTelegramNotificationSetting | null> => (
        storedEnabled === null ? null : { key, enabled: storedEnabled, updatedAt: new Date(), updatedBy: null }
    ));
});

afterEach(() => {
    mock.restoreAll();
    for (const name of envNames) {
        if (previousEnv[name] === undefined) delete process.env[name];
        else process.env[name] = previousEnv[name];
    }
});

const student = {
    id: 42,
    firstName: 'Anna',
    lastName: '<Jansen>',
    branchName: 'Arnhem',
    createdByEmail: 'manager@example.test',
    source: 'CRM' as const,
};

const customer = (id: number, overrides: Partial<NewMollieCustomerNotification> = {}): NewMollieCustomerNotification => ({
    id,
    name: `Payer ${id}`,
    source: 'MOLLIE_SYNC',
    linkedToStudent: false,
    ...overrides,
});

const sentTexts = (postMock: { mock: { calls: Array<{ arguments: unknown[] }> } }) => (
    postMock.mock.calls.map((call) => (call.arguments[1] as { text: string }).text)
);

test('buildNewStudentNotification shows name, branch, source, creator and a link, escaping HTML', () => {
    const message = buildNewStudentNotification(student);

    assert.match(message, /Новый ученик/);
    assert.match(message, /Anna &lt;Jansen&gt;/);
    assert.match(message, /Arnhem/);
    assert.match(message, /CRM/);
    assert.match(message, /manager@example\.test/);
    assert.match(message, /https:\/\/crm\.example\.test\/clients\/42"/);
});

test('buildNewStudentNotification names the Telegram Mini App as the source', () => {
    assert.match(buildNewStudentNotification({ ...student, source: 'TELEGRAM_MINIAPP' }), /Telegram Mini App/);
});

test('buildNewStudentNotification leaves out the branch, creator and link when they are unknown', () => {
    delete process.env.CLIENT_URL;
    const message = buildNewStudentNotification({ id: 1, firstName: 'Anna', lastName: null, source: 'CRM' });

    assert.doesNotMatch(message, /Филиал/);
    assert.doesNotMatch(message, /Создал/);
    assert.doesNotMatch(message, /href/);
});

test('buildNewMollieCustomerNotification shows name, source and link state without contact details', () => {
    const message = buildNewMollieCustomerNotification(customer(5, { name: 'Test Parent', linkedToStudent: true }));

    assert.match(message, /Новый клиент Mollie/);
    assert.match(message, /Test Parent/);
    assert.match(message, /синхронизация с Mollie/);
    assert.match(message, /привязан/);
    assert.doesNotMatch(message, /не привязан/);
    assert.match(message, /https:\/\/crm\.example\.test\/mollie\/customers\/5"/);
    assert.doesNotMatch(message, /@/);
});

test('buildNewMollieCustomerNotification marks an unlinked customer created in the CRM', () => {
    const message = buildNewMollieCustomerNotification(customer(6, { source: 'CRM', name: null }));

    assert.match(message, /создан в CRM/);
    assert.match(message, /не привязан/);
    assert.match(message, /Без имени/);
});

test('buildNewMollieCustomersSummaryNotification reports the count and links to the list', () => {
    const message = buildNewMollieCustomersSummaryNotification(7);

    assert.match(message, /7/);
    assert.match(message, /https:\/\/crm\.example\.test\/mollie\/customers"/);
});

test('notifyNewStudent does not send while the notification is off by default', async (t) => {
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));

    assert.equal(await notifyNewStudent(student), false);
    assert.equal(postMock.mock.callCount(), 0);
});

test('notifyNewStudent sends once the notification is switched on', async (t) => {
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));
    storedEnabled = true;

    assert.equal(await notifyNewStudent(student), true);
    assert.match(sentTexts(postMock)[0], /Новый ученик/);
});

test('notifyNewMollieCustomers does not send while the notification is off by default', async (t) => {
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));

    assert.equal(await notifyNewMollieCustomers([customer(1)]), false);
    assert.equal(postMock.mock.callCount(), 0);
});

test('notifyNewMollieCustomers sends nothing for an empty list', async (t) => {
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));
    storedEnabled = true;

    assert.equal(await notifyNewMollieCustomers([]), false);
    assert.equal(postMock.mock.callCount(), 0);
});

test('notifyNewMollieCustomers sends one message per customer up to three', async (t) => {
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));
    storedEnabled = true;

    assert.equal(await notifyNewMollieCustomers([customer(1), customer(2), customer(3)]), true);

    const texts = sentTexts(postMock);
    assert.equal(texts.length, 3);
    assert.match(texts[2], /Payer 3/);
});

test('notifyNewMollieCustomers sends a single summary for more than three customers', async (t) => {
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));
    storedEnabled = true;

    assert.equal(await notifyNewMollieCustomers([customer(1), customer(2), customer(3), customer(4)]), true);

    const texts = sentTexts(postMock);
    assert.equal(texts.length, 1);
    assert.match(texts[0], /4/);
    assert.doesNotMatch(texts[0], /Payer 1/);
});
