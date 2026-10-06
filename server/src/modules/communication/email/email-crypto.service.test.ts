import assert from 'node:assert/strict';
import test from 'node:test';

process.env.EMAIL_CREDENTIALS_ENCRYPTION_KEY ??= 'test-only-encryption-key';

import { decryptEmailSecret, encryptEmailSecret } from './email-crypto.service';

test('encrypted email secret round-trips back to the original value', () => {
    const original = 'super-secret-imap-password';
    const encrypted = encryptEmailSecret(original);

    assert.notEqual(encrypted, original);
    assert.equal(decryptEmailSecret(encrypted), original);
});

test('encrypting the same value twice produces different ciphertext (random IV)', () => {
    const encryptedA = encryptEmailSecret('same-password');
    const encryptedB = encryptEmailSecret('same-password');

    assert.notEqual(encryptedA, encryptedB);
    assert.equal(decryptEmailSecret(encryptedA), 'same-password');
    assert.equal(decryptEmailSecret(encryptedB), 'same-password');
});

test('decrypting a tampered or malformed value throws instead of silently failing', () => {
    assert.throws(() => decryptEmailSecret('not-a-valid-format'));
    assert.throws(() => decryptEmailSecret('v1.bad.bad.bad'));

    const encrypted = encryptEmailSecret('another-password');
    const tampered = encrypted.slice(0, -4) + 'XXXX';
    assert.throws(() => decryptEmailSecret(tampered));
});
