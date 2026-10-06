import test from 'node:test';
import assert from 'node:assert/strict';
import {
    generateOpaqueToken,
    generateSixDigitCode,
    hashTwoFactorCode,
    hashTwoFactorToken,
    verifyCode,
} from './auth.two-factor.service';

process.env.JWT_ACCESS_SECRET ||= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret';

test('generated codes are always six digits', () => {
    for (let i = 0; i < 50; i += 1) {
        const code = generateSixDigitCode();
        assert.match(code, /^\d{6}$/);
    }
});

test('generated opaque tokens are random', () => {
    const token = generateOpaqueToken();
    const nextToken = generateOpaqueToken();

    assert.match(token, /^[A-Za-z0-9_-]+$/);
    assert.notEqual(token, nextToken);
});

test('code hashing does not expose the raw code and is deterministic', () => {
    const code = generateSixDigitCode();
    const hash = hashTwoFactorCode(code);

    assert.notEqual(hash, code);
    assert.equal(hashTwoFactorCode(code), hash);
    assert.notEqual(hashTwoFactorCode(generateSixDigitCode()), hash);
});

test('token hashing does not collide with code hashing for the same raw value', () => {
    // Both share one HMAC secret but are namespaced separately — a token and a
    // code that happen to be the same string must not hash to the same value.
    const value = '123456';
    assert.notEqual(hashTwoFactorToken(value), hashTwoFactorCode(value));
});

test('verifyCode accepts the correct code and rejects everything else', () => {
    const code = generateSixDigitCode();
    const codeHash = hashTwoFactorCode(code);

    assert.equal(verifyCode(code, codeHash), true);
    assert.equal(verifyCode('000000', codeHash), false);
    assert.equal(verifyCode(code.slice(0, 5), codeHash), false);
});
