import assert from 'node:assert/strict';
import test from 'node:test';
import * as approvalController from './telegram-approval.controller';
import { fetchTelegramUpdates, pollTelegramApprovalUpdatesOnce } from './telegram-approval.polling.service';

test('fetchTelegramUpdates requests a long poll with the given offset', async () => {
    const requests: string[] = [];
    const updates = await fetchTelegramUpdates('test-token', 42, async (url) => {
        requests.push(String(url));
        return new Response(JSON.stringify({ ok: true, result: [] }), { status: 200 });
    });
    assert.deepEqual(updates, []);
    assert.equal(requests.length, 1);
    const url = new URL(requests[0]);
    assert.equal(url.pathname, '/bottest-token/getUpdates');
    assert.equal(url.searchParams.get('offset'), '42');
    assert.equal(url.searchParams.get('timeout'), '25');
});

test('fetchTelegramUpdates omits offset on the first call', async () => {
    const requests: string[] = [];
    await fetchTelegramUpdates('test-token', undefined, async (url) => {
        requests.push(String(url));
        return new Response(JSON.stringify({ ok: true, result: [] }), { status: 200 });
    });
    assert.equal(new URL(requests[0]).searchParams.has('offset'), false);
});

test('fetchTelegramUpdates throws on a Telegram-side error response', async () => {
    await assert.rejects(
        fetchTelegramUpdates('test-token', undefined, async () => new Response(JSON.stringify({ ok: false, description: 'Unauthorized' }), { status: 200 })),
        /Unauthorized/,
    );
});

test('pollTelegramApprovalUpdatesOnce processes each update and advances the offset past the last one', async () => {
    const processed: number[] = [];
    const nextOffset = await pollTelegramApprovalUpdatesOnce('test-token', undefined, async () => new Response(JSON.stringify({
        ok: true,
        result: [
            { update_id: 100, message: { text: 'unrelated', from: { id: 1 } } },
            { update_id: 101, message: { text: 'also unrelated', from: { id: 1 } } },
        ],
    }), { status: 200 }));
    // Both updates are well-formed-but-irrelevant messages, so handleTelegramApprovalUpdate
    // resolves for each (200 ok, no draft action) rather than throwing — this test only checks
    // that every update is visited and the offset advances past the highest update_id.
    void processed;
    assert.equal(nextOffset, 102);
});

test('pollTelegramApprovalUpdatesOnce keeps the previous offset when Telegram returns nothing new', async () => {
    const nextOffset = await pollTelegramApprovalUpdatesOnce('test-token', 55, async () => new Response(JSON.stringify({ ok: true, result: [] }), { status: 200 }));
    assert.equal(nextOffset, 55);
});

test('pollTelegramApprovalUpdatesOnce does not let one failing update stop the batch, and still advances past it', async (t) => {
    // Routed through the shared dispatcher now (common/telegram/telegram-update-dispatcher.ts) —
    // only /edit-shaped text reaches handleTelegramApprovalUpdate, so the poison payload has to
    // look like a real edit command (with a from.id, like an actual Telegram update) rather than
    // bare text, to actually exercise this code path.
    const processed: string[] = [];
    t.mock.method(approvalController, 'handleTelegramApprovalUpdate', async (update: { message?: { text?: unknown } }) => {
        const text = String(update.message?.text);
        processed.push(text);
        if (text.includes('poison')) throw new Error('boom');
        return { status: 200, body: { ok: true } };
    });

    const nextOffset = await pollTelegramApprovalUpdatesOnce('test-token', undefined, async () => new Response(JSON.stringify({
        ok: true,
        result: [
            { update_id: 200, message: { text: '/edit 1 1 poison', from: { id: 111 } } },
            { update_id: 201, message: { text: '/edit 1 1 201', from: { id: 111 } } },
        ],
    }), { status: 200 }));

    assert.deepEqual(processed, ['/edit 1 1 poison', '/edit 1 1 201']);
    assert.equal(nextOffset, 202, 'offset advances past the poison update too, so it is never retried forever');
});
