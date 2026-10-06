import assert from 'node:assert/strict';
import test from 'node:test';
import {
    isTelegramNotificationEnabled,
    isTelegramNotificationKey,
    listTelegramNotificationSettings,
    setTelegramNotificationEnabled,
    TELEGRAM_NOTIFICATION_DEFINITIONS,
} from './notification-settings.service';
import {
    TELEGRAM_NOTIFICATION_KEYS,
    type StoredTelegramNotificationSetting,
    type TelegramNotificationSettingsRepository,
} from './notification-settings.types';

const admin = { id: 7, email: 'admin@example.test' };

const createFakeRepository = (initial: StoredTelegramNotificationSetting[] = []) => {
    const rows = new Map(initial.map((row) => [row.key, row]));
    const repository: TelegramNotificationSettingsRepository = {
        findByKey: async (key) => rows.get(key) ?? null,
        findAll: async () => Array.from(rows.values()),
        upsert: async ({ key, enabled, updatedById }) => {
            const row = {
                key,
                enabled,
                updatedAt: new Date('2026-10-02T12:00:00.000Z'),
                updatedBy: updatedById ? { id: updatedById, email: admin.email } : null,
            };
            rows.set(key, row);
            return row;
        },
    };
    return repository;
};

const failingRepository: TelegramNotificationSettingsRepository = {
    findByKey: async () => { throw new Error('db down'); },
    findAll: async () => { throw new Error('db down'); },
    upsert: async () => { throw new Error('db down'); },
};

const storedRow = (key: string, enabled: boolean): StoredTelegramNotificationSetting => ({
    key, enabled, updatedAt: new Date('2026-10-01T09:00:00.000Z'), updatedBy: admin,
});

const withEnv = async (vars: Record<string, string | undefined>, fn: () => Promise<void>) => {
    const previous = Object.fromEntries(Object.keys(vars).map((name) => [name, process.env[name]]));
    const apply = (values: Record<string, string | undefined>) => Object.entries(values).forEach(([name, value]) => {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
    });
    apply(vars);
    try { await fn(); } finally { apply(previous); }
};

test('only the student and Mollie record notifications are off by default', () => {
    const offByDefault = TELEGRAM_NOTIFICATION_DEFINITIONS.filter((definition) => !definition.defaultEnabled);

    assert.equal(TELEGRAM_NOTIFICATION_DEFINITIONS.length, 11);
    assert.deepEqual(
        offByDefault.map((definition) => definition.key).sort(),
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

test('isTelegramNotificationEnabled keeps a new notification off when the database fails', async (t) => {
    t.mock.method(console, 'error', () => {});
    assert.equal(await isTelegramNotificationEnabled(TELEGRAM_NOTIFICATION_KEYS.NEW_STUDENT, failingRepository), false);
});

test('isTelegramNotificationKey rejects unknown keys', () => {
    assert.equal(isTelegramNotificationKey(TELEGRAM_NOTIFICATION_KEYS.MOLLIE_PAYMENT), true);
    assert.equal(isTelegramNotificationKey('SOMETHING_ELSE'), false);
    assert.equal(isTelegramNotificationKey(undefined), false);
});

test('isTelegramNotificationEnabled falls back to the default when nothing is stored', async () => {
    const enabled = await isTelegramNotificationEnabled(TELEGRAM_NOTIFICATION_KEYS.LOGIN_BLOCKED, createFakeRepository());
    assert.equal(enabled, true);
});

test('isTelegramNotificationEnabled returns the stored value', async () => {
    const repository = createFakeRepository([storedRow(TELEGRAM_NOTIFICATION_KEYS.LOGIN_BLOCKED, false)]);
    assert.equal(await isTelegramNotificationEnabled(TELEGRAM_NOTIFICATION_KEYS.LOGIN_BLOCKED, repository), false);
});

test('isTelegramNotificationEnabled falls back to the default when the database fails', async (t) => {
    t.mock.method(console, 'error', () => {});
    assert.equal(await isTelegramNotificationEnabled(TELEGRAM_NOTIFICATION_KEYS.ROLE_CHANGED, failingRepository), true);
});

test('listTelegramNotificationSettings merges stored rows over the defaults', async () => {
    const repository = createFakeRepository([storedRow(TELEGRAM_NOTIFICATION_KEYS.NEW_EMAIL, false)]);
    const settings = await listTelegramNotificationSettings(repository);

    assert.deepEqual(settings.map((setting) => setting.key), TELEGRAM_NOTIFICATION_DEFINITIONS.map((d) => d.key));
    const email = settings.find((setting) => setting.key === TELEGRAM_NOTIFICATION_KEYS.NEW_EMAIL);
    assert.equal(email?.enabled, false);
    assert.deepEqual(email?.updatedBy, admin);
    const payment = settings.find((setting) => setting.key === TELEGRAM_NOTIFICATION_KEYS.MOLLIE_PAYMENT);
    assert.equal(payment?.enabled, true);
    assert.equal(payment?.updatedAt, null);
    assert.equal(payment?.updatedBy, null);
});

test('listTelegramNotificationSettings reports whether the recipient chat is configured', async () => {
    await withEnv({ TELEGRAM_TOKEN: 'token', TELEGRAM_CHAT_ID: 'group', TELEGRAM_EMAIL_NOTIFY_CHAT_ID: undefined }, async () => {
        const settings = await listTelegramNotificationSettings(createFakeRepository());
        const configuredByKey = Object.fromEntries(settings.map((setting) => [setting.key, setting.configured]));

        assert.equal(configuredByKey[TELEGRAM_NOTIFICATION_KEYS.MOLLIE_PAYMENT], true);
        assert.equal(configuredByKey[TELEGRAM_NOTIFICATION_KEYS.NEW_EMAIL], false);
    });
});

test('setTelegramNotificationEnabled stores the value and reports a change', async () => {
    const repository = createFakeRepository();
    const result = await setTelegramNotificationEnabled(
        { key: TELEGRAM_NOTIFICATION_KEYS.MOLLIE_PAYMENT, enabled: false, updatedById: admin.id },
        repository,
    );

    assert.equal(result.changed, true);
    assert.equal(result.setting.enabled, false);
    assert.deepEqual(result.setting.updatedBy, admin);
    assert.equal(await isTelegramNotificationEnabled(TELEGRAM_NOTIFICATION_KEYS.MOLLIE_PAYMENT, repository), false);
});

test('setTelegramNotificationEnabled does not report a change when the value stays the same', async () => {
    const result = await setTelegramNotificationEnabled(
        { key: TELEGRAM_NOTIFICATION_KEYS.MOLLIE_PAYMENT, enabled: true, updatedById: admin.id },
        createFakeRepository(),
    );

    assert.equal(result.changed, false);
    assert.equal(result.setting.enabled, true);
});
