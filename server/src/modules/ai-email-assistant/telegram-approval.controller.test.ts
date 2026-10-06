import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import type { Request, Response } from 'express';
import { fromPartial } from '@total-typescript/shoehorn';
import { buildDraftCallbackData, parseDraftCallbackData, parseDraftEditCommand } from './telegram-approval.controller';
import { telegramWebhookController } from '../../common/telegram/telegram-webhook.controller';
import prisma from '../../../prisma/prisma-client';

const withEnv = (vars: Record<string, string | undefined>, fn: () => Promise<void>) => {
    const previous: Record<string, string | undefined> = {};
    for (const key of Object.keys(vars)) previous[key] = process.env[key];
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

const fakeResponse = () => {
    const calls: { status?: number; body?: unknown } = {};
    const res: Response = fromPartial({
        status(code: number) { calls.status = code; return res; },
        json(body: unknown) { calls.body = body; return res; },
    });
    return { res, calls };
};

const editCallbackRequest = (fromId: number): Request => fromPartial({
    header: (name: string) => (name === 'x-telegram-bot-api-secret-token' ? 'webhook-secret' : undefined),
    body: { callback_query: { data: 'ai:draft:12:3:edit', from: { id: fromId } } },
});

const draftCallbackRequest = (action: 'approve' | 'reject' | 'spam', fromId: number): Request => fromPartial({
    header: (name: string) => (name === 'x-telegram-bot-api-secret-token' ? 'webhook-secret' : undefined),
    body: { callback_query: { data: `ai:draft:12:3:${action}`, from: { id: fromId } } },
});

test('Telegram callback data carries the immutable draft version', () => {
    const value = buildDraftCallbackData(12, 3, 'approve');
    assert.equal(value, 'ai:draft:12:3:approve');
    assert.deepEqual(parseDraftCallbackData(value), { draftId: 12, draftVersion: 3, action: 'approve' });
});

test('Telegram callback parser rejects malformed or unsupported payloads', () => {
    assert.equal(parseDraftCallbackData('ai:draft:12:3:send'), null);
    assert.equal(parseDraftCallbackData('ai:draft:12:0:approve'), null);
    assert.equal(parseDraftCallbackData(42), null);
});

test('Telegram edit command preserves spaces and binds the draft version', () => {
    assert.deepEqual(parseDraftEditCommand('/edit 12 3 Please call us after 18:00'), {
        draftId: 12, draftVersion: 3, action: 'edit', editedBody: 'Please call us after 18:00',
    });
    assert.equal(parseDraftEditCommand('/edit 12 3'), null);
});

test('tapping Edit sends a real Telegram message with the exact command to type next', async (t) => {
    // Regression: responding to the webhook with a plain JSON body is not the same as sending a
    // chat message — Telegram never renders it, so the operator sees nothing after tapping Edit
    // unless the bot actively calls sendMessage (found live in this session).
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));
    const { res, calls } = fakeResponse();

    await withEnv({
        TELEGRAM_WEBHOOK_SECRET: 'webhook-secret',
        TELEGRAM_APPROVER_IDS: '111',
        TELEGRAM_TOKEN: 'bot-token',
        TELEGRAM_CHAT_ID: 'chat-id',
    }, () => telegramWebhookController(editCallbackRequest(111), res));

    assert.equal(postMock.mock.callCount(), 1);
    const [, body] = postMock.mock.calls[0].arguments;
    assert.match((body as { text: string }).text, /\/edit 12 3 ваш новый текст/);
    assert.deepEqual(calls.body, { ok: true, requiresEdit: true });
});

test('tapping Edit as an unauthorized actor is rejected without sending a Telegram message', async (t) => {
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));
    const { res, calls } = fakeResponse();

    await withEnv({
        TELEGRAM_WEBHOOK_SECRET: 'webhook-secret',
        TELEGRAM_APPROVER_IDS: '111',
        TELEGRAM_TOKEN: 'bot-token',
        TELEGRAM_CHAT_ID: 'chat-id',
    }, () => telegramWebhookController(editCallbackRequest(999), res));

    assert.equal(postMock.mock.callCount(), 0);
    assert.equal(calls.status, 403);
});

const stubDraftRepository = (t: test.TestContext, status: 'GENERATED' | 'EDITED' = 'GENERATED') => {
    const originalFindUnique = prisma.aiEmailDraft.findUnique;
    const originalUpdateMany = prisma.aiEmailDraft.updateMany;
    const originalApprovalCreate = prisma.aiEmailApproval.create;
    (prisma.aiEmailDraft as unknown as { findUnique: unknown }).findUnique = async () => ({ id: 12, version: 3, status });
    (prisma.aiEmailDraft as unknown as { updateMany: unknown }).updateMany = async () => ({ count: 1 });
    (prisma.aiEmailApproval as unknown as { create: unknown }).create = async () => ({ id: 1 });
    t.after(() => {
        (prisma.aiEmailDraft as unknown as { findUnique: unknown }).findUnique = originalFindUnique;
        (prisma.aiEmailDraft as unknown as { updateMany: unknown }).updateMany = originalUpdateMany;
        (prisma.aiEmailApproval as unknown as { create: unknown }).create = originalApprovalCreate;
    });
};

// Regression: applyDraftAction only wrote to the DB — the webhook response body is invisible to
// the operator, so a successful "Reject" (or Approve/Spam) tap looked identical to a dropped one
// (found live in this session, same class of bug the "Edit" fix above addresses).
test('tapping Reject sends a visible confirmation, not just a silent DB write', async (t) => {
    stubDraftRepository(t);
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));
    const { res, calls } = fakeResponse();

    await withEnv({
        TELEGRAM_WEBHOOK_SECRET: 'webhook-secret',
        TELEGRAM_APPROVER_IDS: '111',
        TELEGRAM_TOKEN: 'bot-token',
        TELEGRAM_CHAT_ID: 'chat-id',
    }, () => telegramWebhookController(draftCallbackRequest('reject', 111), res));

    assert.equal(postMock.mock.callCount(), 1);
    const [, body] = postMock.mock.calls[0].arguments;
    assert.match((body as { text: string }).text, /Черновик отклонён/);
    assert.deepEqual(calls.body, { ok: true, status: 'REJECTED' });
});

test('tapping Approve and Spam also send a visible confirmation', async (t) => {
    for (const [action, expectedText] of [['approve', /одобрен/], ['spam', /спам/]] as const) {
        await t.test(action, async (subT) => {
            stubDraftRepository(subT);
            const postMock = subT.mock.method(axios, 'post', async () => ({ data: {} }));
            const { res } = fakeResponse();

            await withEnv({
                TELEGRAM_WEBHOOK_SECRET: 'webhook-secret',
                TELEGRAM_APPROVER_IDS: '111',
                TELEGRAM_TOKEN: 'bot-token',
                TELEGRAM_CHAT_ID: 'chat-id',
            }, () => telegramWebhookController(draftCallbackRequest(action, 111), res));

            assert.equal(postMock.mock.callCount(), 1);
            const [, body] = postMock.mock.calls[0].arguments;
            assert.match((body as { text: string }).text, expectedText);
        });
    }
});

test('tapping Reject as an unauthorized actor sends no confirmation (matches the empty-allowlist bug found in production)', async (t) => {
    stubDraftRepository(t);
    const postMock = t.mock.method(axios, 'post', async () => ({ data: {} }));
    const { res, calls } = fakeResponse();

    // TELEGRAM_APPROVER_IDS deliberately omitted — this reproduces the actual production
    // incident: an unset allowlist rejects every actor, including a legitimate admin.
    await withEnv({
        TELEGRAM_WEBHOOK_SECRET: 'webhook-secret', TELEGRAM_APPROVER_IDS: undefined,
        TELEGRAM_TOKEN: 'bot-token', TELEGRAM_CHAT_ID: 'chat-id',
    }, () => telegramWebhookController(draftCallbackRequest('reject', 111), res));

    assert.equal(postMock.mock.callCount(), 0);
    assert.equal(calls.status, 403);
});
