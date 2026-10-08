import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    buildAuthorizeUrl, createState, exchangeCode, isValidState, needsRefresh, parseRedirect, readCompanies, refreshGrant, toGrant, weeztixConfig,
} from './weeztix.oauth';

const env = { APP_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'), WEEZTIX_CLIENT_ID: 'client-1', WEEZTIX_CLIENT_SECRET: 'top-secret', WEEZTIX_REDIRECT_URI: 'https://example.test/' } as NodeJS.ProcessEnv;
const config = weeztixConfig(env);
const now = Date.parse('2026-10-08T12:00:00Z');

test('the server refuses to start a connection without a configured OAuth client', () => {
    assert.throws(() => weeztixConfig({ WEEZTIX_CLIENT_ID: 'x' } as NodeJS.ProcessEnv), /not configured/);
});

test('the authorize address carries the client, the exact redirect and the state, never the secret', () => {
    const url = new URL(buildAuthorizeUrl(config, 'state-1'));
    assert.equal(url.origin + url.pathname, 'https://login.weeztix.com/login');
    assert.equal(url.searchParams.get('client_id'), 'client-1');
    assert.equal(url.searchParams.get('redirect_uri'), 'https://example.test/');
    assert.equal(url.searchParams.get('response_type'), 'code');
    assert.equal(url.searchParams.get('state'), 'state-1');
    assert.equal(url.toString().includes('top-secret'), false);
});

test('a state is valid only for the person who started, only for 15 minutes, and only untouched', () => {
    const state = createState('user-1', now, env);
    assert.equal(isValidState(state, 'user-1', now + 60_000, env), true);
    assert.equal(isValidState(state, 'user-2', now + 60_000, env), false);
    assert.equal(isValidState(state, 'user-1', now + 16 * 60_000, env), false);
    assert.equal(isValidState(`${state}x`, 'user-1', now, env), false);
    assert.equal(isValidState('garbage', 'user-1', now, env), false);
    const otherKey = { ...env, APP_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString('base64') } as NodeJS.ProcessEnv;
    assert.equal(isValidState(state, 'user-1', now, otherKey), false);
});

test('the pasted address gives the code and the state; anything else is refused with a reason', () => {
    assert.deepEqual(parseRedirect(' https://example.test/?code=abc&state=s1 '), { code: 'abc', state: 's1' });
    assert.throws(() => parseRedirect('abc'), /whole address/);
    // Only the code was copied: it is accepted together with the state of the started connection.
    const code = 'def5020093c34f2b89d8e1da709e53d10cf577cc';
    assert.deepEqual(parseRedirect(` ${code} `, 's1'), { code, state: 's1' });
    assert.throws(() => parseRedirect(code), /whole address/);
    assert.throws(() => parseRedirect('https://example.test/?state=s1'), /no authorization code/);
    assert.throws(() => parseRedirect('https://example.test/?code=abc'), /no authorization code/);
    assert.throws(() => parseRedirect('https://example.test/?error=access_denied&state=s1'), /not granted/);
});

test('a token answer becomes stored tokens with absolute expiry times and the reachable companies', () => {
    const grant = toGrant({ token_type: 'Bearer', expires_in: 259200, access_token: 'A', refresh_token: 'R', refresh_token_expires_in: 31535999, info: { companies: [{ guid: 'c-1', name: 'HHDC' }] } }, now);
    assert.equal(grant.tokens.accessExpiresAt, '2026-10-11T12:00:00.000Z');
    assert.equal(grant.tokens.refreshExpiresAt.startsWith('2027-10-08'), true);
    assert.deepEqual(grant.companies, [{ guid: 'c-1', name: 'HHDC' }]);
    assert.throws(() => toGrant({ error: 'invalid_grant' }, now), /did not return a token/);
});

test('companies are read from a list or from a map by GUID, and a missing list is empty', () => {
    assert.deepEqual(readCompanies({ companies: { 'c-9': { name: 'Camp' } } }), [{ guid: 'c-9', name: 'Camp' }]);
    assert.deepEqual(readCompanies({ companies: [{ name: 'no guid' }] }), []);
    assert.deepEqual(readCompanies(undefined), []);
});

test('a token is refreshed shortly before it expires, not earlier', () => {
    assert.equal(needsRefresh({ accessExpiresAt: new Date(now + 4 * 60_000).toISOString() }, now), true);
    assert.equal(needsRefresh({ accessExpiresAt: new Date(now - 1000).toISOString() }, now), true);
    assert.equal(needsRefresh({ accessExpiresAt: new Date(now + 60 * 60_000).toISOString() }, now), false);
});

const answering = (status: number, body: unknown, seen: Array<{ url: string; body: Record<string, string> }> = []) => (async (url: unknown, init?: RequestInit) => {
    seen.push({ url: String(url), body: JSON.parse(String(init?.body ?? '{}')) });
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}) as typeof fetch;

test('the code is exchanged with the same redirect, and a refresh sends the refresh token', async () => {
    const seen: Array<{ url: string; body: Record<string, string> }> = [];
    const ok = { expires_in: 10, access_token: 'A', refresh_token: 'R2', refresh_token_expires_in: 20 };
    await exchangeCode(config, 'abc', answering(200, ok, seen));
    await refreshGrant(config, 'R1', answering(200, ok, seen));
    assert.equal(seen[0].url, 'https://auth.weeztix.com/tokens');
    assert.deepEqual(seen[0].body, { grant_type: 'authorization_code', client_id: 'client-1', client_secret: 'top-secret', redirect_uri: 'https://example.test/', code: 'abc' });
    assert.deepEqual(seen[1].body, { grant_type: 'refresh_token', client_id: 'client-1', client_secret: 'top-secret', refresh_token: 'R1' });
});

test('a refused exchange reports the provider reason without leaking the secret', async () => {
    await assert.rejects(() => exchangeCode(config, 'used', answering(400, { error: 'invalid_grant', error_description: 'Code already used' })), (error: Error) => {
        assert.match(error.message, /Code already used/);
        assert.equal(error.message.includes('top-secret'), false);
        return true;
    });
});
