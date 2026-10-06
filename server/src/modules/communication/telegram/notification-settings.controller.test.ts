import assert from 'node:assert/strict';
import test, { afterEach, beforeEach, mock } from 'node:test';
import type { Request, Response } from 'express';
import axios from 'axios';
import {
    listTelegramNotificationSettingsController,
    updateTelegramNotificationSettingController,
    updateTelegramNotificationSettingSchema,
} from './notification-settings.controller';
import { telegramNotificationSettingsRepository } from './notification-settings.service';
import {
    TELEGRAM_NOTIFICATION_KEYS,
    type SetTelegramNotificationInput,
    type StoredTelegramNotificationSetting,
} from './notification-settings.types';

const admin = { id: 7, email: 'admin@example.test' };
const telegramEnv = ['TELEGRAM_TOKEN', 'TELEGRAM_CHAT_ID'];
let previousEnv: Record<string, string | undefined> = {};
let rows: Map<string, StoredTelegramNotificationSetting>;

const upsertRow = async (input: SetTelegramNotificationInput): Promise<StoredTelegramNotificationSetting> => {
    const row = { key: input.key, enabled: input.enabled, updatedAt: new Date(), updatedBy: admin };
    rows.set(input.key, row);
    return row;
};

beforeEach(() => {
    rows = new Map();
    previousEnv = Object.fromEntries(telegramEnv.map((name) => [name, process.env[name]]));
    process.env.TELEGRAM_TOKEN = 'token';
    process.env.TELEGRAM_CHAT_ID = 'chat-id';
    mock.method(telegramNotificationSettingsRepository, 'findByKey', async (key: string) => rows.get(key) ?? null);
    mock.method(telegramNotificationSettingsRepository, 'findAll', async () => Array.from(rows.values()));
    mock.method(telegramNotificationSettingsRepository, 'upsert', upsertRow);
});

afterEach(() => {
    mock.restoreAll();
    for (const name of telegramEnv) {
        if (previousEnv[name] === undefined) delete process.env[name];
        else process.env[name] = previousEnv[name];
    }
});

const createResponse = () => {
    const state: { status: number; body: unknown } = { status: 200, body: undefined };
    const res = {} as Response;
    res.status = ((code: number) => { state.status = code; return res; }) as Response['status'];
    res.json = ((body: unknown) => { state.body = body; return res; }) as Response['json'];
    return { res, state };
};

const updateRequest = (key: string, body: unknown) => {
    const req = {} as Request;
    req.params = { key };
    req.body = body;
    req.user = { id: admin.id, email: admin.email } as Request['user'];
    return req;
};

// The Telegram announcement is fire-and-forget; let its promise chain settle before asserting.
const flushAnnouncements = () => new Promise((resolve) => setImmediate(resolve));

test('update schema accepts only a boolean enabled flag', () => {
    assert.equal(updateTelegramNotificationSettingSchema.safeParse({ enabled: false }).success, true);
    assert.equal(updateTelegramNotificationSettingSchema.safeParse({ enabled: 'false' }).success, false);
    assert.equal(updateTelegramNotificationSettingSchema.safeParse({ enabled: true, extra: 1 }).success, false);
    assert.equal(updateTelegramNotificationSettingSchema.safeParse({}).success, false);
});

test('list returns every notification with its default state', async () => {
    const { res, state } = createResponse();
    await listTelegramNotificationSettingsController({} as Request, res);

    const { items } = state.body as { items: Array<{ key: string; enabled: boolean }> };
    assert.equal(items.length, 11);
    assert.deepEqual(
        items.filter((item) => !item.enabled).map((item) => item.key).sort(),
        [
            TELEGRAM_NOTIFICATION_KEYS.MOLLIE_CUSTOMER_DELETED,
            TELEGRAM_NOTIFICATION_KEYS.MOLLIE_MANDATE,
            TELEGRAM_NOTIFICATION_KEYS.MOLLIE_SUBSCRIPTION,
            TELEGRAM_NOTIFICATION_KEYS.NEW_MOLLIE_CUSTOMER,
            TELEGRAM_NOTIFICATION_KEYS.NEW_STUDENT,
            TELEGRAM_NOTIFICATION_KEYS.STUDENT_DELETED,
        ],
    );
});

test('update stores the new state and announces the change to the group', async (t) => {
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));
    const { res, state } = createResponse();

    await updateTelegramNotificationSettingController(updateRequest(TELEGRAM_NOTIFICATION_KEYS.LOGIN_BLOCKED, { enabled: false }), res);
    await flushAnnouncements();

    assert.equal(state.status, 200);
    assert.equal((state.body as { enabled: boolean }).enabled, false);
    assert.equal(rows.get(TELEGRAM_NOTIFICATION_KEYS.LOGIN_BLOCKED)?.enabled, false);
    assert.equal(postMock.mock.callCount(), 1);
    const [, body] = postMock.mock.calls[0].arguments;
    assert.match((body as { text: string }).text, /выключено/);
    assert.match((body as { text: string }).text, /admin@example\.test/);
});

test('update does not announce when the state did not change', async (t) => {
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));
    const { res, state } = createResponse();

    await updateTelegramNotificationSettingController(updateRequest(TELEGRAM_NOTIFICATION_KEYS.LOGIN_BLOCKED, { enabled: true }), res);
    await flushAnnouncements();

    assert.equal(state.status, 200);
    assert.equal(postMock.mock.callCount(), 0);
});

test('update still succeeds when the Telegram announcement fails', async (t) => {
    t.mock.method(axios, 'post', async () => { throw new Error('telegram down'); });
    const errorMock = t.mock.method(console, 'error', () => {});
    const { res, state } = createResponse();

    await updateTelegramNotificationSettingController(updateRequest(TELEGRAM_NOTIFICATION_KEYS.NEW_EMAIL, { enabled: false }), res);
    await flushAnnouncements();

    assert.equal(state.status, 200);
    assert.equal(errorMock.mock.callCount(), 1);
});

test('update rejects an unknown notification key', async () => {
    const { res, state } = createResponse();
    await updateTelegramNotificationSettingController(updateRequest('NOT_A_NOTIFICATION', { enabled: false }), res);

    assert.equal(state.status, 404);
    assert.equal(rows.size, 0);
});

test('update rejects an invalid body', async () => {
    const { res, state } = createResponse();
    await updateTelegramNotificationSettingController(updateRequest(TELEGRAM_NOTIFICATION_KEYS.NEW_EMAIL, { enabled: 'no' }), res);

    assert.equal(state.status, 400);
    assert.equal(rows.size, 0);
});
