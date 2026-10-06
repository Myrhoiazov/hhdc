import assert from 'node:assert/strict';
import test, { afterEach, beforeEach, mock } from 'node:test';
import axios from 'axios';
import {
    buildMollieCustomerDeletedNotification,
    buildMollieMandateNotification,
    buildMollieMandatesSummaryNotification,
    buildMollieSubscriptionNotification,
    buildMollieSubscriptionsSummaryNotification,
    buildStudentDeletedNotification,
    notifyMollieCustomerDeleted,
    notifyMollieMandates,
    notifyMollieSubscriptions,
    notifyStudentDeleted,
    type MollieMandateNotification,
    type MollieSubscriptionNotification,
} from './record-lifecycle-notifications.service';
import { telegramNotificationSettingsRepository } from './notification-settings.service';
import { TELEGRAM_NOTIFICATION_KEYS, type StoredTelegramNotificationSetting } from './notification-settings.types';

const envNames = ['TELEGRAM_TOKEN', 'TELEGRAM_CHAT_ID', 'CLIENT_URL'];
let previousEnv: Record<string, string | undefined> = {};
// Keys switched on for the test; every lifecycle notification is off by default.
let enabledKeys: string[] = [];

beforeEach(() => {
    enabledKeys = [];
    previousEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
    process.env.TELEGRAM_TOKEN = 'token';
    process.env.TELEGRAM_CHAT_ID = 'chat-id';
    process.env.CLIENT_URL = 'https://crm.example.test/';
    mock.method(telegramNotificationSettingsRepository, 'findByKey', async (key: string): Promise<StoredTelegramNotificationSetting | null> => (
        enabledKeys.includes(key) ? { key, enabled: true, updatedAt: new Date(), updatedBy: null } : null
    ));
});

afterEach(() => {
    mock.restoreAll();
    for (const name of envNames) {
        if (previousEnv[name] === undefined) delete process.env[name];
        else process.env[name] = previousEnv[name];
    }
});

const deletedStudent = {
    firstName: 'Anna',
    lastName: '<Jansen>',
    branchName: 'Arnhem',
    deletedByEmail: 'manager@example.test',
};

const mandate = (customerId: number, overrides: Partial<MollieMandateNotification> = {}): MollieMandateNotification => ({
    action: 'CREATED',
    source: 'CRM',
    customerId,
    customerName: `Payer ${customerId}`,
    method: 'directdebit',
    actorEmail: 'manager@example.test',
    ...overrides,
});

const subscription = (customerId: number, overrides: Partial<MollieSubscriptionNotification> = {}): MollieSubscriptionNotification => ({
    action: 'CREATED',
    source: 'CRM',
    customerId,
    customerName: `Payer ${customerId}`,
    amountValue: '45.00',
    amountCurrency: 'EUR',
    interval: '1 month',
    startDate: '2026-11-01',
    actorEmail: 'manager@example.test',
    ...overrides,
});

const sentTexts = (postMock: { mock: { calls: Array<{ arguments: unknown[] }> } }) => (
    postMock.mock.calls.map((call) => (call.arguments[1] as { text: string }).text)
);

const mockTelegram = (t: test.TestContext) => t.mock.method(axios, 'post', async () => ({ data: {} }));

test('buildStudentDeletedNotification shows name, branch and who deleted, escaping HTML, without a link', () => {
    const message = buildStudentDeletedNotification(deletedStudent);

    assert.match(message, /Ученик удалён/);
    assert.match(message, /Anna &lt;Jansen&gt;/);
    assert.match(message, /Arnhem/);
    assert.match(message, /manager@example\.test/);
    assert.doesNotMatch(message, /href/);
});

test('buildStudentDeletedNotification leaves out the branch and the actor when they are unknown', () => {
    const message = buildStudentDeletedNotification({ firstName: null, lastName: null });

    assert.match(message, /Без имени/);
    assert.doesNotMatch(message, /Филиал/);
    assert.doesNotMatch(message, /Удалил/);
});

test('buildMollieCustomerDeletedNotification shows the payer name and who deleted, without a link', () => {
    const message = buildMollieCustomerDeletedNotification({ name: 'Test <Parent>', deletedByEmail: 'manager@example.test' });

    assert.match(message, /Клиент Mollie удалён/);
    assert.match(message, /Test &lt;Parent&gt;/);
    assert.match(message, /manager@example\.test/);
    assert.doesNotMatch(message, /href/);
});

test('buildMollieMandateNotification describes a mandate created in the CRM with a link to the payer', () => {
    const message = buildMollieMandateNotification(mandate(5));

    assert.match(message, /Мандат Mollie создан/);
    assert.match(message, /Payer 5/);
    assert.match(message, /directdebit/);
    assert.match(message, /создан в CRM/);
    assert.match(message, /manager@example\.test/);
    assert.match(message, /https:\/\/crm\.example\.test\/mollie\/customers\/5"/);
    assert.doesNotMatch(message, /Отменено подписок/);
});

test('buildMollieMandateNotification reports the subscriptions cancelled by a revoked mandate', () => {
    const message = buildMollieMandateNotification(mandate(5, { action: 'REVOKED', canceledSubscriptions: 2 }));

    assert.match(message, /Мандат Mollie отозван/);
    assert.match(message, /Отменено подписок:<\/b> 2/);
});

test('buildMollieMandateNotification names the Mollie sync as the source and has no actor', () => {
    const message = buildMollieMandateNotification(mandate(5, { source: 'MOLLIE_SYNC', actorEmail: undefined }));

    assert.match(message, /синхронизация с Mollie/);
    assert.doesNotMatch(message, /Сотрудник/);
});

test('buildMollieSubscriptionNotification shows amount, interval, start date and a link', () => {
    const message = buildMollieSubscriptionNotification(subscription(8, { description: 'Hip-hop <kids>' }));

    assert.match(message, /Подписка Mollie создана/);
    assert.match(message, /Payer 8/);
    assert.match(message, /45\.00 EUR/);
    assert.match(message, /1 month/);
    assert.match(message, /2026-11-01/);
    assert.match(message, /Hip-hop &lt;kids&gt;/);
    assert.match(message, /https:\/\/crm\.example\.test\/mollie\/customers\/8"/);
});

test('buildMollieSubscriptionNotification titles a cancelled and a restarted subscription', () => {
    assert.match(buildMollieSubscriptionNotification(subscription(8, { action: 'CANCELED' })), /Подписка Mollie отменена/);
    assert.match(buildMollieSubscriptionNotification(subscription(8, { action: 'RESTARTED' })), /Подписка Mollie перезапущена/);
});

test('the sync summaries report the count and link to the customer list', () => {
    assert.match(buildMollieMandatesSummaryNotification(6), /Новые мандаты Mollie[\s\S]*6/);
    assert.match(buildMollieSubscriptionsSummaryNotification(9), /Новые подписки Mollie[\s\S]*9/);
    assert.match(buildMollieMandatesSummaryNotification(6), /https:\/\/crm\.example\.test\/mollie\/customers"/);
});

test('no lifecycle notification is sent while it is off by default', async (t) => {
    const postMock = mockTelegram(t);

    assert.equal(await notifyStudentDeleted(deletedStudent), false);
    assert.equal(await notifyMollieCustomerDeleted({ name: 'Payer' }), false);
    assert.equal(await notifyMollieMandates([mandate(1)]), false);
    assert.equal(await notifyMollieSubscriptions([subscription(1)]), false);
    assert.equal(postMock.mock.callCount(), 0);
});

test('notifyStudentDeleted sends once the notification is switched on', async (t) => {
    const postMock = mockTelegram(t);
    enabledKeys = [TELEGRAM_NOTIFICATION_KEYS.STUDENT_DELETED];

    assert.equal(await notifyStudentDeleted(deletedStudent), true);
    assert.match(sentTexts(postMock)[0], /Ученик удалён/);
});

test('notifyMollieCustomerDeleted sends once the notification is switched on', async (t) => {
    const postMock = mockTelegram(t);
    enabledKeys = [TELEGRAM_NOTIFICATION_KEYS.MOLLIE_CUSTOMER_DELETED];

    assert.equal(await notifyMollieCustomerDeleted({ name: 'Payer' }), true);
    assert.match(sentTexts(postMock)[0], /Клиент Mollie удалён/);
});

test('notifyMollieMandates sends one message per mandate up to three', async (t) => {
    const postMock = mockTelegram(t);
    enabledKeys = [TELEGRAM_NOTIFICATION_KEYS.MOLLIE_MANDATE];

    assert.equal(await notifyMollieMandates([mandate(1), mandate(2), mandate(3)]), true);

    const texts = sentTexts(postMock);
    assert.equal(texts.length, 3);
    assert.match(texts[2], /Payer 3/);
});

test('notifyMollieMandates sends a single summary for more than three mandates', async (t) => {
    const postMock = mockTelegram(t);
    enabledKeys = [TELEGRAM_NOTIFICATION_KEYS.MOLLIE_MANDATE];

    assert.equal(await notifyMollieMandates([1, 2, 3, 4].map((id) => mandate(id))), true);

    const texts = sentTexts(postMock);
    assert.equal(texts.length, 1);
    assert.match(texts[0], /4/);
    assert.doesNotMatch(texts[0], /Payer 1/);
});

test('notifyMollieSubscriptions sends per subscription up to three and a summary above', async (t) => {
    const postMock = mockTelegram(t);
    enabledKeys = [TELEGRAM_NOTIFICATION_KEYS.MOLLIE_SUBSCRIPTION];

    assert.equal(await notifyMollieSubscriptions([subscription(1), subscription(2)]), true);
    assert.equal(await notifyMollieSubscriptions([1, 2, 3, 4, 5].map((id) => subscription(id))), true);

    const texts = sentTexts(postMock);
    assert.equal(texts.length, 3);
    assert.match(texts[2], /Новые подписки Mollie/);
});

test('the mandate and subscription notifications send nothing for an empty list', async (t) => {
    const postMock = mockTelegram(t);
    enabledKeys = [TELEGRAM_NOTIFICATION_KEYS.MOLLIE_MANDATE, TELEGRAM_NOTIFICATION_KEYS.MOLLIE_SUBSCRIPTION];

    assert.equal(await notifyMollieMandates([]), false);
    assert.equal(await notifyMollieSubscriptions([]), false);
    assert.equal(postMock.mock.callCount(), 0);
});
