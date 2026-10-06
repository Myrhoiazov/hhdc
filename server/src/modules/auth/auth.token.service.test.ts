import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSessionToken, hashSessionToken } from './auth.token.service';

process.env.JWT_ACCESS_SECRET ||= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret';

test('generated session tokens are opaque and random', () => {
    const token = generateSessionToken();
    const nextToken = generateSessionToken();

    assert.match(token, /^[A-Za-z0-9_-]+$/);
    assert.notEqual(token, nextToken);
});

test('session token hash does not expose the raw token', () => {
    const token = generateSessionToken();
    const hash = hashSessionToken(token);

    assert.match(hash, /^[a-f0-9]{64}$/);
    assert.notEqual(hash, token);
    assert.equal(hashSessionToken(token), hash);
    assert.notEqual(hashSessionToken(generateSessionToken()), hash);
});
