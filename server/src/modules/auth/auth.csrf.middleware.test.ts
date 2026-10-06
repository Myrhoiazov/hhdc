import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import { fromPartial } from '@total-typescript/shoehorn';
import { csrfProtection } from './auth.csrf.middleware';

const fakeReq = (overrides: Partial<{ method: string; path: string; headers: Record<string, string>; cookies: Record<string, string> }> = {}): Request => fromPartial({
    method: overrides.method ?? 'POST',
    path: overrides.path ?? '/some/route',
    cookies: overrides.cookies ?? {},
    get: (name: string) => overrides.headers?.[name.toLowerCase()],
    header: (name: string) => overrides.headers?.[name.toLowerCase()],
});

const fakeRes = () => {
    const calls: { status?: number; body?: unknown } = {};
    const res: Response = fromPartial({
        status(code: number) { calls.status = code; return res; },
        json(body: unknown) { calls.body = body; return res; },
    });
    return { res, calls };
};

// Server-to-server webhooks (Mollie, Instagram, Telegram) carry no session/CSRF cookies and no
// browser Origin header — each authenticates itself with its own secret/signature check instead,
// so the generic browser-CSRF gate must not apply to them.
for (const path of ['/mollie/webhook', '/instagram/webhook', '/telegram/webhook']) {
    test(`${path} is exempt from CSRF checks even with no cookies/origin`, () => {
        const req = fakeReq({ path });
        const { res, calls } = fakeRes();
        let calledNext = false;
        csrfProtection(req, res, () => { calledNext = true; });
        assert.equal(calledNext, true);
        assert.equal(calls.status, undefined);
    });
}

test('a non-exempt POST route without an Origin still requires the CSRF token', () => {
    const previousMode = process.env.MODE;
    process.env.MODE = 'production';
    try {
        const req = fakeReq({ path: '/clients', method: 'POST' });
        const { res, calls } = fakeRes();
        csrfProtection(req, res, () => {});
        assert.equal(calls.status, 403);
    } finally {
        if (previousMode === undefined) delete process.env.MODE;
        else process.env.MODE = previousMode;
    }
});

test('GET requests are never subject to CSRF checks', () => {
    const req = fakeReq({ path: '/clients', method: 'GET' });
    const { res, calls } = fakeRes();
    let calledNext = false;
    csrfProtection(req, res, () => { calledNext = true; });
    assert.equal(calledNext, true);
    assert.equal(calls.status, undefined);
});

test('allows the loopback alias of the configured local frontend origin', () => {
    const previousMode = process.env.MODE;
    const previousClientUrl = process.env.CLIENT_URL;
    process.env.MODE = 'development';
    process.env.CLIENT_URL = 'http://localhost:3011';
    try {
        const { res, calls } = fakeRes();
        csrfProtection(fakeReq({
            path: '/clients',
            headers: { origin: 'http://127.0.0.1:3011' },
        }), res, () => {});
        assert.deepEqual(calls.body, { message: 'CSRF token invalid' });
    } finally {
        if (previousMode === undefined) delete process.env.MODE;
        else process.env.MODE = previousMode;
        if (previousClientUrl === undefined) delete process.env.CLIENT_URL;
        else process.env.CLIENT_URL = previousClientUrl;
    }
});

test('exempts a non-empty Telegram header on a protected API route', () => {
    const req = fakeReq({ path: '/clients', headers: { 'x-telegram-init-data': 'signed-data' } });
    const { res, calls } = fakeRes();
    let next = false;
    csrfProtection(req, res, () => { next = true; });
    assert.equal(next, true);
    assert.equal(calls.status, undefined);
});
for (const value of ['', '   ']) {
    test(`an empty Telegram header ${JSON.stringify(value)} does not exempt CSRF`, () => {
        const { res, calls } = fakeRes();
        csrfProtection(fakeReq({ path: '/clients', headers: { 'x-telegram-init-data': value } }), res, () => assert.fail('must reject'));
        assert.equal(calls.status, 403);
    });
}
