import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import { Request, Response } from 'express';
import { loginRateLimit } from './auth.login-rate-limit.middleware';

const withTurnstileEnv = async (fn: () => Promise<void>) => {
    const previousSiteKey = process.env.TURNSTILE_SITE_KEY;
    const previousSecretKey = process.env.TURNSTILE_SECRET_KEY;
    const previousRedisUrl = process.env.REDIS_URL;
    process.env.TURNSTILE_SITE_KEY = 'site-key';
    process.env.TURNSTILE_SECRET_KEY = 'secret-key';
    delete process.env.REDIS_URL;

    try {
        await fn();
    } finally {
        if (previousSiteKey === undefined) delete process.env.TURNSTILE_SITE_KEY;
        else process.env.TURNSTILE_SITE_KEY = previousSiteKey;
        if (previousSecretKey === undefined) delete process.env.TURNSTILE_SECRET_KEY;
        else process.env.TURNSTILE_SECRET_KEY = previousSecretKey;
        if (previousRedisUrl === undefined) delete process.env.REDIS_URL;
        else process.env.REDIS_URL = previousRedisUrl;
    }
};

const createReq = (email: string, captchaToken?: string) => ({
    ip: '203.0.113.5',
    body: {
        email,
        password: 'secret',
        ...(captchaToken ? { captchaToken } : {}),
    },
}) as Request;

const createRes = () => {
    const response = {
        statusCode: 200,
        headers: {} as Record<string, unknown>,
        body: undefined as unknown,
        locals: {} as Record<string, unknown>,
        setHeader(name: string, value: unknown) {
            this.headers[name] = value;
        },
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(body: unknown) {
            this.body = body;
            return this;
        },
        on() {
            return this;
        },
    };

    return response as unknown as Response & {
        statusCode: number;
        body: unknown;
        locals: Record<string, unknown>;
    };
};

const hitUntilCaptchaRequired = async (email: string, captchaToken?: string) => {
    const req = createReq(email, captchaToken);
    const res = createRes();
    let nextCalled = false;
    let resolveNext: (() => void) | undefined;
    const nextPromise = new Promise<void>((resolve) => {
        resolveNext = resolve;
    });
    await loginRateLimit(req, res, () => {
        nextCalled = true;
        resolveNext?.();
    });
    if (!res.body && !nextCalled) {
        await nextPromise;
    }
    return { res, nextCalled };
};

test('loginRateLimit exposes the login attempt count to downstream handlers', async () => {
    await withTurnstileEnv(async () => {
        const email = `count-${Date.now()}@example.com`;

        const first = await hitUntilCaptchaRequired(email);
        const second = await hitUntilCaptchaRequired(email);

        assert.equal(first.nextCalled, true);
        assert.equal(first.res.locals.loginRateLimitCount, 1);
        assert.equal(second.nextCalled, true);
        assert.equal(second.res.locals.loginRateLimitCount, 2);
    });
});

test('loginRateLimit rejects missing captchaToken on the captcha threshold attempt', async () => {
    await withTurnstileEnv(async () => {
        const email = `missing-${Date.now()}@example.com`;

        await hitUntilCaptchaRequired(email);
        await hitUntilCaptchaRequired(email);
        const { res, nextCalled } = await hitUntilCaptchaRequired(email);

        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 400);
        assert.deepEqual(res.body, {
            code: 'CAPTCHA_REQUIRED',
            message: 'Подтвердите, что вы не робот, и попробуйте снова.',
            siteKey: 'site-key',
        });
    });
});

test('loginRateLimit rejects an invalid Turnstile token on the threshold attempt after calling Siteverify', async (t) => {
    await withTurnstileEnv(async () => {
        const email = `invalid-${Date.now()}@example.com`;
        const postMock = t.mock.method(axios, 'post', async () => ({ data: { success: false } }));

        await hitUntilCaptchaRequired(email);
        await hitUntilCaptchaRequired(email);
        const { res, nextCalled } = await hitUntilCaptchaRequired(email, 'bad-token');

        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 400);
        assert.equal((res.body as { code: string }).code, 'CAPTCHA_INVALID');
        assert.equal(postMock.mock.callCount(), 1);
    });
});

test('loginRateLimit allows a valid Turnstile token on the threshold attempt after Siteverify succeeds', async (t) => {
    await withTurnstileEnv(async () => {
        const email = `valid-${Date.now()}@example.com`;
        const postMock = t.mock.method(axios, 'post', async (_url: string, body: URLSearchParams) => {
            assert.equal(body.get('secret'), 'secret-key');
            assert.equal(body.get('response'), 'valid-token');
            assert.equal(body.get('remoteip'), '203.0.113.5');
            return { data: { success: true } };
        });

        await hitUntilCaptchaRequired(email);
        await hitUntilCaptchaRequired(email);
        const { res, nextCalled } = await hitUntilCaptchaRequired(email, 'valid-token');

        assert.equal(nextCalled, true);
        assert.equal(res.statusCode, 200);
        assert.equal(postMock.mock.callCount(), 1);
    });
});
