import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notifyEmailReceived, notifyEmailSyncFailed, sendTelegramNotification } from './notify';

const config = { token: 'test-token', chatId: '-1000000000001', clientUrl: 'https://crm.example.test' };

test('Telegram email notification contains an inbox link but no email content', async () => {
    let request: { url: string; body: Record<string, unknown> } | undefined;
    const delivered = await notifyEmailReceived(
        { conversationId: '2c81a8b8-1556-47af-96fd-0be50e6d8561', entityId: 'message-id', personId: 'private-person-id', receivedAt: new Date().toISOString() },
        { config, fetchImpl: async (input, init) => {
            request = { url: String(input), body: JSON.parse(String(init?.body)) };
            return Response.json({ ok: true });
        } },
    );

    assert.equal(delivered, true);
    assert.equal(request?.url, 'https://api.telegram.org/bottest-token/sendMessage');
    assert.equal(request?.body.chat_id, '-1000000000001');
    assert.match(String(request?.body.text), /https:\/\/crm\.example\.test\/email/);
    assert.doesNotMatch(String(request?.body.text), /message-id|private-person-id/);
});

test('Telegram delivery is disabled without explicit configuration', async () => {
    let called = false;
    const delivered = await sendTelegramNotification('hello', {
        config: null,
        fetchImpl: async () => { called = true; return Response.json({ ok: true }); },
    });

    assert.equal(delivered, false);
    assert.equal(called, false);
});

test('Telegram provider failure is contained', async () => {
    const delivered = await sendTelegramNotification('hello', {
        config,
        fetchImpl: async () => new Response('provider details', { status: 503 }),
    });

    assert.equal(delivered, false);
});

test('Telegram sync failure alert names the mailbox without provider error details', async () => {
    let text = '';
    const delivered = await notifyEmailSyncFailed('2c81a8b8-1556-47af-96fd-0be50e6d8561', {
        config,
        fetchImpl: async (_input, init) => {
            text = String(JSON.parse(String(init?.body)).text);
            return Response.json({ ok: true });
        },
    });

    assert.equal(delivered, true);
    assert.equal(text, '⚠️ Email sync failed\nMailbox: 2c81a8b8-1556-47af-96fd-0be50e6d8561');
});

test('Telegram stays quiet for old mail imported from the mailbox history', async () => {
    let called = false;
    const fetchImpl = async () => { called = true; return Response.json({ ok: true }); };
    const now = Date.parse('2026-10-07T12:00:00.000Z');
    const payload = { conversationId: '2c81a8b8-1556-47af-96fd-0be50e6d8561' };

    assert.equal(await notifyEmailReceived({ ...payload, receivedAt: '2026-09-01T12:00:00.000Z' }, { config, fetchImpl, now }), false);
    assert.equal(await notifyEmailReceived(payload, { config, fetchImpl, now }), false);
    assert.equal(called, false);
    assert.equal(await notifyEmailReceived({ ...payload, receivedAt: '2026-10-07T11:00:00.000Z' }, { config, fetchImpl, now }), true);
});
