import test from 'node:test';
import assert from 'node:assert/strict';
import { createCsrfToken, verifyCsrfToken } from './auth.csrf.service';

process.env.CSRF_SECRET ||= 'test-csrf-secret';

test('csrf token is bound to a session token', () => {
    const sessionToken = 'session-token-a';
    const csrfToken = createCsrfToken(sessionToken);

    assert.match(csrfToken, /^[a-f0-9]{64}$/);
    assert.equal(verifyCsrfToken(sessionToken, csrfToken), true);
    assert.equal(verifyCsrfToken('session-token-b', csrfToken), false);
    assert.equal(verifyCsrfToken(sessionToken, 'bad-token'), false);
});
