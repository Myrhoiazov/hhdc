import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildAuthenticatedUserData,
    buildCaptchaPrewarmLoginError,
    describeLoginFailure,
    maskEmail,
    authenticatedUserSelect,
} from './auth.controller';

// Type-compatible with the AuthenticatedUser shape the controller works with.
const user: NonNullable<Parameters<typeof describeLoginFailure>[0]> = {
    id: 7,
    firstName: 'Ada',
    lastName: 'Lovelace',
    role: 'ADMIN',
    email: 'ada@example.com',
    isEnabled: true,
    isActive: true,
    lastLogin: new Date('2026-01-01T00:00:00Z'),
};

const minimalUser: Parameters<typeof buildAuthenticatedUserData>[0] = {
    id: 7,
    firstName: 'Ada',
    lastName: 'Lovelace',
    role: 'ADMIN',
    email: 'ada@example.com',
    isEnabled: true,
    isActive: true,
    lastLogin: new Date('2026-01-01T00:00:00Z'),
};

test('maskEmail hides the local part but keeps the domain', () => {
    assert.equal(maskEmail('ada@example.com'), 'a***@example.com');
    assert.equal(maskEmail('x@example.com'), 'x***@example.com');
    assert.equal(maskEmail('no-domain'), 'no-domain');
});

test('describeLoginFailure reports a disabled account distinctly', () => {
    assert.equal(describeLoginFailure(user).reason, 'INVALID_CREDENTIALS');
    assert.equal(describeLoginFailure(null).reason, 'INVALID_CREDENTIALS');
    assert.equal(describeLoginFailure({ ...user, isEnabled: false }).reason, 'ACCOUNT_DISABLED');
    assert.equal(describeLoginFailure(null).targetUserId, undefined);
});

test('buildAuthenticatedUserData exposes exactly the safe user profile', () => {
    const lastLogin = new Date('2026-09-04T10:00:00Z');
    const data = buildAuthenticatedUserData(minimalUser, lastLogin);

    assert.deepEqual(data, {
        id: 7,
        firstName: 'Ada',
        lastName: 'Lovelace',
        role: 'ADMIN',
        email: 'ada@example.com',
        isEnabled: true,
        isActive: true,
        lastLogin,
    });
    assert.equal('password' in data, false);
    assert.equal('salt' in data, false);
});

test('authenticatedUserSelect includes exactly the safe user profile fields', () => {
    assert.ok(authenticatedUserSelect, 'authenticatedUserSelect should be exported');
    const select = authenticatedUserSelect as Record<string, unknown>;

    assert.equal(select.id, true);
    assert.equal(select.firstName, true);
    assert.equal(select.lastName, true);
    assert.equal(select.role, true);
    assert.equal(select.email, true);
    assert.equal(select.isEnabled, true);
    assert.equal(select.isActive, true);
    assert.equal(select.lastLogin, true);

    // Sensitive fields must never be selected
    assert.equal('password' in select, false);
    assert.equal('salt' in select, false);
    assert.equal('authVersion' in select, false);
});

test('buildCaptchaPrewarmLoginError returns a captcha hint before the threshold attempt', () => {
    const previousSiteKey = process.env.TURNSTILE_SITE_KEY;
    const previousSecretKey = process.env.TURNSTILE_SECRET_KEY;
    process.env.TURNSTILE_SITE_KEY = 'site-key';
    process.env.TURNSTILE_SECRET_KEY = 'secret-key';

    try {
        assert.deepEqual(buildCaptchaPrewarmLoginError('Неверный email или пароль', 2), {
            code: 'CAPTCHA_REQUIRED',
            message: 'Неверный email или пароль',
            siteKey: 'site-key',
        });
        assert.equal(buildCaptchaPrewarmLoginError('Неверный email или пароль', 1), null);
    } finally {
        if (previousSiteKey === undefined) delete process.env.TURNSTILE_SITE_KEY;
        else process.env.TURNSTILE_SITE_KEY = previousSiteKey;
        if (previousSecretKey === undefined) delete process.env.TURNSTILE_SECRET_KEY;
        else process.env.TURNSTILE_SECRET_KEY = previousSecretKey;
    }
});
