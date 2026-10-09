import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendTelegramNotification } from './notify';

const config = { token: 'test-token', chatId: '-1000000000001' };

test('a message is posted to the configured chat with the bot token in the address only', async () => {
    let request: { url: string; body: Record<string, unknown> } | undefined;
    const delivered = await sendTelegramNotification('📨 New inbound email\nhttps://crm.example.test/email', { config, fetchImpl: async (input, init) => {
        request = { url: String(input), body: JSON.parse(String(init?.body)) };
        return Response.json({ ok: true });
    } });

    assert.equal(delivered, true);
    assert.equal(request?.url, 'https://api.telegram.org/bottest-token/sendMessage');
    assert.equal(request?.body.chat_id, '-1000000000001');
    assert.equal(request?.body.text, '📨 New inbound email\nhttps://crm.example.test/email');
    assert.doesNotMatch(JSON.stringify(request?.body), /test-token/);
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
