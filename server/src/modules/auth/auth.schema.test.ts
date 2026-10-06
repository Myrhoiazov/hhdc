import assert from 'node:assert/strict';
import test from 'node:test';
import { loginSchema } from './auth.schema';

test('loginSchema accepts the existing captchaToken login field', () => {
    const result = loginSchema.safeParse({
        body: {
            email: 'admin@example.com',
            password: 'secret',
            captchaToken: 'turnstile-token',
        },
    });

    assert.equal(result.success, true);
});
