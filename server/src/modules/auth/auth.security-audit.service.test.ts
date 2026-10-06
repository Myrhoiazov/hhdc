import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeAuthSecurityMetadata } from './auth.security-audit.service';

test('auth security metadata sanitizer removes sensitive fields', () => {
    const metadata = sanitizeAuthSecurityMetadata({
        email: 'user@example.com',
        password: 'secret',
        nested: {
            refreshToken: 'token',
            reason: 'LOGIN',
        },
        attempts: [
            { csrfToken: 'csrf', result: 'blocked' },
            { count: 5 },
        ],
    });

    assert.deepEqual(metadata, {
        email: 'user@example.com',
        nested: { reason: 'LOGIN' },
        attempts: [
            { result: 'blocked' },
            { count: 5 },
        ],
    });
});
