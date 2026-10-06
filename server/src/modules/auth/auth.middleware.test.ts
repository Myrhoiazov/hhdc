import assert from 'node:assert/strict';
import test from 'node:test';
import { NextFunction, Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { fromPartial } from '@total-typescript/shoehorn';
import { requireRole } from './auth.middleware';

const createReq = (role?: UserRole): Request => fromPartial({
    user: role ? { role } : undefined,
});

const createRes = (): Response => {
    const response = {
        statusCode: 200,
        body: undefined as unknown,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(body: unknown) {
            this.body = body;
            return this;
        },
    };
    return fromPartial(response);
};

test('requireRole blocks a request with no authenticated user', () => {
    const req = createReq(undefined);
    const res = createRes();
    let nextCalled = false;

    requireRole(UserRole.ADMIN)(req, res, (() => { nextCalled = true; }) as NextFunction);

    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
});

test('requireRole blocks a user whose role is not in the allowed list', () => {
    const req = createReq(UserRole.MANAGER);
    const res = createRes();
    let nextCalled = false;

    requireRole(UserRole.ADMIN)(req, res, (() => { nextCalled = true; }) as NextFunction);

    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
});

test('requireRole allows a user whose role is in the allowed list', () => {
    const req = createReq(UserRole.ADMIN);
    const res = createRes();
    let nextCalled = false;

    requireRole(UserRole.ADMIN)(req, res, (() => { nextCalled = true; }) as NextFunction);

    assert.equal(nextCalled, true);
});

test('requireRole allows any role listed among multiple allowed roles', () => {
    const req = createReq(UserRole.MANAGER);
    const res = createRes();
    let nextCalled = false;

    requireRole(UserRole.ADMIN, UserRole.MANAGER)(req, res, (() => { nextCalled = true; }) as NextFunction);

    assert.equal(nextCalled, true);
});

import { createHmac } from 'node:crypto';
import { isAuthenticated } from './auth.middleware';
import prisma from '../../../prisma/prisma-client';
import * as tokenService from './auth.token.service';

const botToken = 'test-miniapp-token';
const signedInitData = () => {
    const fields = { auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: 123456789 }) };
    const check = Object.entries(fields).map(([k, v]) => `${k}=${v}`).join('\n');
    const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
    return new URLSearchParams({ ...fields, hash: createHmac('sha256', secret).update(check).digest('hex') }).toString();
};
const telegramRequest = (data: string | undefined): Request => fromPartial({
    cookies: { ddc_refresh: 'cookie-session' },
    header: (name: string) => name.toLowerCase() === 'x-telegram-init-data' ? data : undefined,
});
const setupTelegram = (t: test.TestContext, user: unknown) => {
    const original = process.env.TELEGRAM_TOKEN;
    process.env.TELEGRAM_TOKEN = botToken;
    t.after(() => { if (original === undefined) delete process.env.TELEGRAM_TOKEN; else process.env.TELEGRAM_TOKEN = original; });
    const delegate = prisma.authIdentity as unknown as Record<string, unknown>;
    const find = delegate.findUnique;
    delegate.findUnique = async () => user ? { user } : null;
    t.after(() => { delegate.findUnique = find; });
};
test('authenticates a signed Mini App request as the linked enabled admin', async (t) => {
    setupTelegram(t, { id: 1, role: 'ADMIN', isEnabled: true });
    const req = telegramRequest(signedInitData());
    const res = createRes();
    let next = false;
    await isAuthenticated(req, res, () => { next = true; });
    assert.equal(next, true);
    assert.equal(req.user?.id, 1);
    assert.equal(req.token, undefined);
});
for (const user of [null, { id: 2, role: 'MANAGER', isEnabled: true }, { id: 1, role: 'ADMIN', isEnabled: false }]) {
    test(`denies signed Mini App access for ${JSON.stringify(user)}`, async (t) => {
        setupTelegram(t, user);
        const res = createRes();
        await isAuthenticated(telegramRequest(signedInitData()), res, () => assert.fail('must deny'));
        assert.equal(res.statusCode, 403);
    });
}
for (const header of ['tampered', '', '   ']) {
    test(`does not fall back to cookies for invalid Telegram header ${JSON.stringify(header)}`, async (t) => {
        setupTelegram(t, { id: 1, role: 'ADMIN', isEnabled: true });
        t.mock.method(tokenService, 'getUserByOpaqueSessionToken', async () => ({ user: { id: 99 } }));
        const res = createRes();
        await isAuthenticated(telegramRequest(header), res, () => assert.fail('must deny'));
        assert.equal(res.statusCode, 401);
    });
}
test('keeps cookie authentication when Telegram header is absent', async (t) => {
    t.mock.method(tokenService, 'getUserByOpaqueSessionToken', async () => ({ user: { id: 99 } }));
    const req = telegramRequest(undefined);
    let next = false;
    await isAuthenticated(req, createRes(), () => { next = true; });
    assert.equal(next, true);
    assert.equal(req.user?.id, 99);
});
