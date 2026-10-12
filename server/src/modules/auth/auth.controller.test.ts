import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCaptchaPrewarmLoginError, maskEmail } from './auth.controller';

const withTurnstile = (configured: boolean, fn: () => void) => {
    const previous = { site: process.env.TURNSTILE_SITE_KEY, secret: process.env.TURNSTILE_SECRET_KEY };
    if (configured) {
        process.env.TURNSTILE_SITE_KEY = 'site-key';
        process.env.TURNSTILE_SECRET_KEY = 'secret-key';
    } else {
        delete process.env.TURNSTILE_SITE_KEY;
        delete process.env.TURNSTILE_SECRET_KEY;
    }
    try {
        fn();
    } finally {
        if (previous.site === undefined) delete process.env.TURNSTILE_SITE_KEY;
        else process.env.TURNSTILE_SITE_KEY = previous.site;
        if (previous.secret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
        else process.env.TURNSTILE_SECRET_KEY = previous.secret;
    }
};

test('maskEmail keeps the first letter and the domain only', () => {
    assert.equal(maskEmail('denis@example.com'), 'd***@example.com');
    assert.equal(maskEmail('not-an-email'), 'not-an-email');
});

test('a failed login asks for a captcha one attempt before the limiter demands it', () => {
    withTurnstile(true, () => {
        assert.equal(buildCaptchaPrewarmLoginError('Invalid email or password', 1), null);
        assert.deepEqual(buildCaptchaPrewarmLoginError('Invalid email or password', 2), {
            code: 'CAPTCHA_REQUIRED',
            message: 'Invalid email or password',
            siteKey: 'site-key',
        });
    });
});

test('a failed login never asks for a captcha while Turnstile is not configured', () => {
    withTurnstile(false, () => {
        assert.equal(buildCaptchaPrewarmLoginError('Invalid email or password', 4), null);
    });
});
