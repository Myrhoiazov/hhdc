import assert from 'node:assert/strict';
import test, { afterEach, beforeEach, mock } from 'node:test';
import axios from 'axios';
import {
    buildLoginBlockedNotification,
    buildMolliePaymentNotification,
    buildNewDeviceAfterFailuresNotification,
    buildNotificationSettingChangedNotification,
    buildRoleChangedNotification,
    notifyLoginBlocked,
    notifyMolliePayment,
    notifyNewDeviceAfterFailures,
    notifyNewEmail,
    notifyNotificationSettingChanged,
    notifyRoleChanged,
} from './telegram.service';
import { telegramNotificationSettingsRepository } from './notification-settings.service';
import type { StoredTelegramNotificationSetting } from './notification-settings.types';

// null = no stored row, so every notification uses its default (enabled). Tests that need a
// switched-off notification set this to false.
let storedEnabled: boolean | null = null;

beforeEach(() => {
    storedEnabled = null;
    mock.method(telegramNotificationSettingsRepository, 'findByKey', async (key: string): Promise<StoredTelegramNotificationSetting | null> => (
        storedEnabled === null ? null : { key, enabled: storedEnabled, updatedAt: new Date(), updatedBy: null }
    ));
});

afterEach(() => {
    mock.restoreAll();
});

const payment = {
    mollieId: 'tr_test',
    status: 'paid',
    amountValue: '80.00',
    amountCurrency: 'EUR',
    refundedAmount: '0.00',
    chargedBackAmount: '0.00',
    description: 'Dance classes',
    method: 'ideal',
    consumerName: 'D. Test',
    paidAt: new Date('2026-06-13T10:00:00.000Z'),
    customer: {
        payerName: 'Test Parent',
        email: 'parent@example.com',
        clientLinks: [{
            client: {
                firstName: 'Test',
                lastName: 'Student',
            },
        }],
    },
    invoice: {
        number: 'INV-2026-100',
        billToName: 'Test Student',
    },
};

test('builds a successful payment notification with customer and invoice data', () => {
    const message = buildMolliePaymentNotification(payment);

    assert.match(message ?? '', /Успешная оплата/);
    assert.match(message ?? '', /D\. Test/);
    assert.match(message ?? '', /Кто оплатил/);
    assert.match(message ?? '', /За кого/);
    assert.match(message ?? '', /Test Student/);
    assert.match(message ?? '', /Статус:<\/b> Оплачен/);
    assert.match(message ?? '', /INV-2026-100/);
    assert.match(message ?? '', /tr_test/);
});

test('builds a refund notification even when payment status remains paid', () => {
    const message = buildMolliePaymentNotification({ ...payment, refundedAmount: '10.00' });

    assert.match(message ?? '', /Возврат по платежу/);
    assert.match(message ?? '', /Возвращено/);
});

test('ignores intermediate payment statuses', () => {
    assert.equal(buildMolliePaymentNotification({ ...payment, status: 'pending', paidAt: null }), null);
});

test('builds a login-blocked notification with email, IP, and retry time', () => {
    const message = buildLoginBlockedNotification({
        email: 'attacker@example.com',
        ip: '203.0.113.7',
        retryAfterSeconds: 900,
    });

    assert.match(message, /Вход заблокирован/);
    assert.match(message, /attacker@example\.com/);
    assert.match(message, /203\.0\.113\.7/);
    assert.match(message, /900/);
});

test('builds a login-blocked notification without IP when not available', () => {
    const message = buildLoginBlockedNotification({
        email: 'attacker@example.com',
        ip: null,
        retryAfterSeconds: 900,
    });

    assert.doesNotMatch(message, /IP/);
});

test('builds a new-device-after-failures notification with email, IP, and failure count', () => {
    const message = buildNewDeviceAfterFailuresNotification({
        email: 'user@example.com',
        ip: '198.51.100.4',
        recentFailures: 3,
    });

    assert.match(message, /нового устройства/);
    assert.match(message, /user@example\.com/);
    assert.match(message, /198\.51\.100\.4/);
    assert.match(message, /3/);
});

test('builds a role-changed notification with target, actor and role transition', () => {
    const message = buildRoleChangedNotification({
        targetEmail: 'target@example.com',
        actorEmail: 'admin@example.com',
        fromRole: 'MANAGER',
        toRole: 'ADMIN',
    });

    assert.match(message, /Изменена роль/);
    assert.match(message, /target@example\.com/);
    assert.match(message, /MANAGER.*ADMIN/);
    assert.match(message, /admin@example\.com/);
});

test('builds a role-changed notification without actor when not available', () => {
    const message = buildRoleChangedNotification({
        targetEmail: 'target@example.com',
        actorEmail: null,
        fromRole: 'MANAGER',
        toRole: 'ADMIN',
    });

    assert.doesNotMatch(message, /Изменил/);
});

const withTelegramEnv = (vars: Record<string, string | undefined>, fn: () => Promise<void>) => {
    const previous: Record<string, string | undefined> = {
        TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
        TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
        TELEGRAM_EMAIL_NOTIFY_CHAT_ID: process.env.TELEGRAM_EMAIL_NOTIFY_CHAT_ID,
    };
    for (const key of Object.keys(vars)) {
        if (vars[key] === undefined) delete process.env[key];
        else process.env[key] = vars[key];
    }
    return fn().finally(() => {
        for (const key of Object.keys(previous)) {
            if (previous[key] === undefined) delete process.env[key];
            else process.env[key] = previous[key];
        }
    });
};

test('notifyLoginBlocked does not call axios when Telegram is not configured', async (t) => {
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));

    await withTelegramEnv({ TELEGRAM_TOKEN: undefined, TELEGRAM_CHAT_ID: undefined }, async () => {
        const result = await notifyLoginBlocked({ email: 'a@b.com', ip: '1.2.3.4', retryAfterSeconds: 60 });
        assert.equal(result, false);
    });

    assert.equal(postMock.mock.callCount(), 0);
});

test('notifyLoginBlocked sends the built message via axios when Telegram is configured', async (t) => {
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));

    await withTelegramEnv({ TELEGRAM_TOKEN: 'token', TELEGRAM_CHAT_ID: 'chat-id' }, async () => {
        const result = await notifyLoginBlocked({ email: 'a@b.com', ip: '1.2.3.4', retryAfterSeconds: 60 });
        assert.equal(result, true);
    });

    assert.equal(postMock.mock.callCount(), 1);
    const [url, body] = postMock.mock.calls[0].arguments;
    assert.match(String(url), /api\.telegram\.org\/bottoken\/sendMessage/);
    assert.match((body as { text: string }).text, /Вход заблокирован/);
});

test('notifyNewDeviceAfterFailures does not call axios when Telegram is not configured', async (t) => {
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));

    await withTelegramEnv({ TELEGRAM_TOKEN: undefined, TELEGRAM_CHAT_ID: undefined }, async () => {
        const result = await notifyNewDeviceAfterFailures({ email: 'a@b.com', ip: '1.2.3.4', recentFailures: 2 });
        assert.equal(result, false);
    });

    assert.equal(postMock.mock.callCount(), 0);
});

test('notifyRoleChanged does not call axios when Telegram is not configured', async (t) => {
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));

    await withTelegramEnv({ TELEGRAM_TOKEN: undefined, TELEGRAM_CHAT_ID: undefined }, async () => {
        const result = await notifyRoleChanged({
            targetEmail: 'target@example.com',
            actorEmail: 'admin@example.com',
            fromRole: 'MANAGER',
            toRole: 'ADMIN',
        });
        assert.equal(result, false);
    });

    assert.equal(postMock.mock.callCount(), 0);
});

test('notifyRoleChanged sends the built message via axios when Telegram is configured', async (t) => {
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));

    await withTelegramEnv({ TELEGRAM_TOKEN: 'token', TELEGRAM_CHAT_ID: 'chat-id' }, async () => {
        const result = await notifyRoleChanged({
            targetEmail: 'target@example.com',
            actorEmail: 'admin@example.com',
            fromRole: 'MANAGER',
            toRole: 'ADMIN',
        });
        assert.equal(result, true);
    });

    assert.equal(postMock.mock.callCount(), 1);
    const [url, body] = postMock.mock.calls[0].arguments;
    assert.match(String(url), /api\.telegram\.org\/bottoken\/sendMessage/);
    assert.match((body as { text: string }).text, /Изменена роль/);
});

test('notifyNewEmail does not call axios when TELEGRAM_EMAIL_NOTIFY_CHAT_ID is unset', async (t) => {
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));

    await withTelegramEnv({ TELEGRAM_TOKEN: 'token', TELEGRAM_CHAT_ID: 'group-chat-id', TELEGRAM_EMAIL_NOTIFY_CHAT_ID: undefined }, async () => {
        const result = await notifyNewEmail({
            fromAddress: 'parent@example.com',
            fromName: 'Test Parent',
            subject: 'Вопрос про расписание',
            accountLabel: 'ddc nl',
        });
        assert.equal(result, false);
    });

    assert.equal(postMock.mock.callCount(), 0);
});

test('notifyNewEmail sends to TELEGRAM_EMAIL_NOTIFY_CHAT_ID, not the group chat', async (t) => {
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));

    await withTelegramEnv({ TELEGRAM_TOKEN: 'token', TELEGRAM_CHAT_ID: 'group-chat-id', TELEGRAM_EMAIL_NOTIFY_CHAT_ID: 'personal-chat-id' }, async () => {
        const result = await notifyNewEmail({
            fromAddress: 'parent@example.com',
            fromName: 'Test Parent',
            subject: 'Вопрос про расписание',
            accountLabel: 'ddc nl',
        });
        assert.equal(result, true);
    });

    assert.equal(postMock.mock.callCount(), 1);
    const [url, body] = postMock.mock.calls[0].arguments;
    assert.match(String(url), /api\.telegram\.org\/bottoken\/sendMessage/);
    const sentBody = body as { chat_id: string; text: string };
    assert.equal(sentBody.chat_id, 'personal-chat-id');
    assert.match(sentBody.text, /Новое письмо/);
    assert.match(sentBody.text, /Test Parent/);
    assert.match(sentBody.text, /parent@example\.com/);
    assert.match(sentBody.text, /Вопрос про расписание/);
    assert.match(sentBody.text, /ddc nl/);
});

test('notifyNewEmail shows the Reply-To address of a contact-form email, and no empty row without one', async (t) => {
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));

    await withTelegramEnv({ TELEGRAM_TOKEN: 'token', TELEGRAM_EMAIL_NOTIFY_CHAT_ID: 'personal-chat-id' }, async () => {
        await notifyNewEmail({ fromAddress: 'wordpress@talentcenterddc.nl', fromName: 'Talent Center DDC', replyToAddress: 'parent@example.com', accountLabel: 'ddc nl' });
        await notifyNewEmail({ fromAddress: 'parent@example.com', replyToAddress: null, accountLabel: 'ddc nl' });
    });

    const [withReplyTo, withoutReplyTo] = postMock.mock.calls.map((call) => (call.arguments[1] as { text: string }).text);
    assert.match(withReplyTo, /Ответ на:<\/b> parent@example\.com/);
    assert.doesNotMatch(withoutReplyTo, /Ответ на|null/);
});

test('notifyNewEmail falls back to "(без темы)" when subject is missing', async (t) => {
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));

    await withTelegramEnv({ TELEGRAM_TOKEN: 'token', TELEGRAM_EMAIL_NOTIFY_CHAT_ID: 'personal-chat-id' }, async () => {
        await notifyNewEmail({ fromAddress: 'parent@example.com', accountLabel: 'ddc nl' });
    });

    const [, body] = postMock.mock.calls[0].arguments;
    assert.match((body as { text: string }).text, /без темы/);
});

const configuredEnv = { TELEGRAM_TOKEN: 'token', TELEGRAM_CHAT_ID: 'chat-id', TELEGRAM_EMAIL_NOTIFY_CHAT_ID: 'private-chat' };

test('notifyMolliePayment sends when the notification is enabled', async (t) => {
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));

    await withTelegramEnv(configuredEnv, async () => {
        assert.equal(await notifyMolliePayment(payment), true);
    });

    assert.equal(postMock.mock.callCount(), 1);
});

const switchedOffCases: Array<[string, () => Promise<boolean>]> = [
    ['notifyMolliePayment', () => notifyMolliePayment(payment)],
    ['notifyLoginBlocked', () => notifyLoginBlocked({ email: 'a@b.com', retryAfterSeconds: 60 })],
    ['notifyNewDeviceAfterFailures', () => notifyNewDeviceAfterFailures({ email: 'a@b.com', recentFailures: 3 })],
    ['notifyRoleChanged', () => notifyRoleChanged({ targetEmail: 'a@b.com', fromRole: 'MANAGER', toRole: 'ADMIN' })],
    ['notifyNewEmail', () => notifyNewEmail({ fromAddress: 'a@b.com', accountLabel: 'Info' })],
];

for (const [name, notify] of switchedOffCases) {
    test(`${name} does not call axios when the notification is switched off`, async (t) => {
        const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));
        storedEnabled = false;

        await withTelegramEnv(configuredEnv, async () => {
            assert.equal(await notify(), false);
        });

        assert.equal(postMock.mock.callCount(), 0);
    });
}

test('buildNotificationSettingChangedNotification names the notification, the new state and the actor', () => {
    const message = buildNotificationSettingChangedNotification({
        title: 'Платежи <Mollie>',
        enabled: false,
        actorEmail: 'admin@example.test',
    });

    assert.match(message, /Изменены настройки уведомлений/);
    assert.match(message, /Платежи &lt;Mollie&gt;/);
    assert.match(message, /выключено/);
    assert.match(message, /admin@example\.test/);
});

test('notifyNotificationSettingChanged is sent even when every notification is switched off', async (t) => {
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));
    storedEnabled = false;

    await withTelegramEnv(configuredEnv, async () => {
        const sent = await notifyNotificationSettingChanged({ title: 'Новое письмо', enabled: true });
        assert.equal(sent, true);
    });

    assert.equal(postMock.mock.callCount(), 1);
    const [, body] = postMock.mock.calls[0].arguments;
    assert.equal((body as { chat_id: string }).chat_id, 'chat-id');
    assert.match((body as { text: string }).text, /включено/);
});

test('notifyNotificationSettingChanged does not call axios when the group chat is not configured', async (t) => {
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));

    await withTelegramEnv({ TELEGRAM_TOKEN: undefined, TELEGRAM_CHAT_ID: undefined }, async () => {
        assert.equal(await notifyNotificationSettingChanged({ title: 'Новое письмо', enabled: true }), false);
    });

    assert.equal(postMock.mock.callCount(), 0);
});
