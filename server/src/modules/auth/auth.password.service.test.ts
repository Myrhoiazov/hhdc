import test from 'node:test';
import assert from 'node:assert/strict';
import { authentication, generateSalt } from '../../common/utils/crypto';
import { hashPassword, isCommonPassword, isPasswordAllowed, verifyPassword } from './auth.password.service';

process.env.SECRET_SALT ||= 'test-secret-salt';

test('Argon2id hashes and verifies passwords', async () => {
    const hash = await hashPassword('correct horse battery staple');

    assert.match(hash, /^\$argon2id\$/);
    assert.equal((await verifyPassword(hash, null, 'correct horse battery staple')).valid, true);
    assert.equal((await verifyPassword(hash, null, 'wrong password')).valid, false);
});

test('legacy HMAC password is accepted only for migration', async () => {
    const salt = generateSalt();
    const hash = authentication(salt, 'legacy password');
    const result = await verifyPassword(hash, salt, 'legacy password');

    assert.equal(result.valid, true);
    assert.equal(result.needsUpgrade, true);
});

test('new password policy requires 12 to 128 characters', () => {
    assert.equal(isPasswordAllowed('short'), false);
    assert.equal(isPasswordAllowed('twelve-chars!'), true);
    assert.equal(isPasswordAllowed('x'.repeat(129)), false);
});

test('isCommonPassword rejects a known leaked password', () => {
    assert.equal(isCommonPassword('qwerty123456'), true);
});

test('isCommonPassword is case-insensitive', () => {
    assert.equal(isCommonPassword('QWERTY123456'), true);
    assert.equal(isCommonPassword('QwErTy123456'), true);
});

test('isCommonPassword allows a unique/random password', () => {
    assert.equal(isCommonPassword('Xk7#mQ2p!zR9vL4w'), false);
});

test('isCommonPassword only matches exact list entries, no fuzzy match', () => {
    assert.equal(isCommonPassword('qwerty123456-with-suffix'), false);
    assert.equal(isCommonPassword('prefix-qwerty123456'), false);
});
