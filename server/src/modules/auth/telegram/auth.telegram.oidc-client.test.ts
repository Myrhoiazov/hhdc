import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildAuthorizationUrl,
    completeAuthorizationCodeExchange,
    derivePkceChallenge,
    generateNonce,
    generatePkceVerifier,
    generateState,
    isTelegramOidcConfigured,
} from './auth.telegram.oidc-client';

process.env.TELEGRAM_OIDC_CLIENT_ID ||= 'test-client-id';
process.env.TELEGRAM_OIDC_CLIENT_SECRET ||= 'test-client-secret';
process.env.TELEGRAM_OIDC_REDIRECT_URI ||= 'https://crm.example.com/api/v1/auth/telegram/callback';

test('generateState and generateNonce produce distinct opaque values', () => {
    assert.match(generateState(), /^[A-Za-z0-9_-]+$/);
    assert.notEqual(generateState(), generateState());
    assert.match(generateNonce(), /^[A-Za-z0-9_-]+$/);
    assert.notEqual(generateNonce(), generateNonce());
});

test('generatePkceVerifier produces an RFC 7636-length value', () => {
    const verifier = generatePkceVerifier();
    assert.ok(verifier.length >= 43 && verifier.length <= 128, `unexpected verifier length ${verifier.length}`);
    assert.match(verifier, /^[A-Za-z0-9_-]+$/);
});

test('derivePkceChallenge is deterministic and does not expose the verifier', () => {
    const verifier = generatePkceVerifier();
    const challenge = derivePkceChallenge(verifier);

    assert.equal(derivePkceChallenge(verifier), challenge);
    assert.notEqual(challenge, verifier);
    assert.notEqual(derivePkceChallenge(generatePkceVerifier()), challenge);
});

test('buildAuthorizationUrl includes state, nonce, PKCE S256 challenge and the configured client/redirect', () => {
    const url = new URL(buildAuthorizationUrl({
        state: 'the-state',
        nonce: 'the-nonce',
        codeChallenge: 'the-challenge',
    }));

    assert.equal(url.origin + url.pathname, 'https://oauth.telegram.org/auth');
    assert.equal(url.searchParams.get('client_id'), 'test-client-id');
    assert.equal(url.searchParams.get('redirect_uri'), 'https://crm.example.com/api/v1/auth/telegram/callback');
    assert.equal(url.searchParams.get('response_type'), 'code');
    assert.equal(url.searchParams.get('state'), 'the-state');
    assert.equal(url.searchParams.get('nonce'), 'the-nonce');
    assert.equal(url.searchParams.get('code_challenge'), 'the-challenge');
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    assert.match(url.searchParams.get('scope') ?? '', /\bopenid\b/);
});

test('isTelegramOidcConfigured reflects whether all three env vars are set', () => {
    const original = process.env.TELEGRAM_OIDC_CLIENT_ID;
    assert.equal(isTelegramOidcConfigured(), true);

    delete process.env.TELEGRAM_OIDC_CLIENT_ID;
    assert.equal(isTelegramOidcConfigured(), false);

    process.env.TELEGRAM_OIDC_CLIENT_ID = original;
});

// TELEGRAM_OIDC_TEST_MODE is the E2E-only seam (playwright.config.ts) that
// replaces the real oauth.telegram.org round trip — see the comment on
// isOidcTestMode in auth.telegram.oidc-client.ts for why it exists.
test('TELEGRAM_OIDC_TEST_MODE redirects the authorization URL to our own redirect_uri, carrying the nonce', () => {
    process.env.TELEGRAM_OIDC_TEST_MODE = 'true';
    try {
        const url = new URL(buildAuthorizationUrl({
            state: 'the-state',
            nonce: 'the-nonce',
            codeChallenge: 'the-challenge',
        }));

        assert.equal(`${url.origin}${url.pathname}`, 'https://crm.example.com/api/v1/auth/telegram/callback');
        assert.equal(url.searchParams.get('state'), 'the-state');
        assert.ok(url.searchParams.get('code'), 'expected a fake code param');
    } finally {
        delete process.env.TELEGRAM_OIDC_TEST_MODE;
    }
});

test('TELEGRAM_OIDC_TEST_MODE makes completeAuthorizationCodeExchange resolve without any network call', async () => {
    process.env.TELEGRAM_OIDC_TEST_MODE = 'true';
    try {
        const state = 'the-state';
        const nonce = 'the-nonce';
        const url = new URL(buildAuthorizationUrl({ state, nonce, codeChallenge: 'the-challenge' }));
        const fakeCode = url.searchParams.get('code') as string;

        const result = await completeAuthorizationCodeExchange(fakeCode, 'unused-verifier');

        assert.equal(result.nonce, nonce);
        assert.equal(result.identity.providerUserId, 'e2e-telegram-user');
    } finally {
        delete process.env.TELEGRAM_OIDC_TEST_MODE;
    }
});
