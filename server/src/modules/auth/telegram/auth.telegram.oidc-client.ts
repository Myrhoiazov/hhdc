import crypto from 'crypto';
import axios from 'axios';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// Fixed endpoints for Telegram's OIDC provider — see
// https://core.telegram.org/bots/telegram-login. Hardcoded the same way
// service.Payments.Auth.ts hardcodes Mollie's token endpoint: these are stable,
// provider-owned URLs, not per-deployment config.
const AUTHORIZATION_ENDPOINT = 'https://oauth.telegram.org/auth';
const TOKEN_ENDPOINT = 'https://oauth.telegram.org/token';
const JWKS_URL = 'https://oauth.telegram.org/.well-known/jwks.json';
const ISSUER = 'https://oauth.telegram.org';

// Cached across requests — createRemoteJWKSet keeps its own JWKS cache/refresh
// internally, so this must only be constructed once per process.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
const getJwks = () => {
    if (!jwks) {
        jwks = createRemoteJWKSet(new URL(JWKS_URL));
    }
    return jwks;
};

const telegramOidcClientId = () => process.env.TELEGRAM_OIDC_CLIENT_ID;
const telegramOidcClientSecret = () => process.env.TELEGRAM_OIDC_CLIENT_SECRET;
const telegramOidcRedirectUri = () => process.env.TELEGRAM_OIDC_REDIRECT_URI;

export const isTelegramOidcConfigured = () => Boolean(
    telegramOidcClientId() && telegramOidcClientSecret() && telegramOidcRedirectUri(),
);

// Test-only seam: when TELEGRAM_OIDC_TEST_MODE=true, the entire external
// Telegram round trip (authorize redirect + code exchange + ID token) is
// replaced by a same-origin loop back to our own callback carrying a
// deterministic fake identity. Used exclusively by the Playwright E2E suite
// (see playwright.config.ts's serverEnvironment) so CI never depends on
// oauth.telegram.org being reachable — docs/spec/DDC_CRM_TELEGRAM_AUTH_SPEC.md
// §15: "Mock Telegram/OIDC boundaries; do not depend on real Telegram in
// normal CI." Never set outside E2E — nothing in dev/.env.example or the
// production compose files defines this variable.
const isOidcTestMode = () => process.env.TELEGRAM_OIDC_TEST_MODE === 'true';

const TEST_MODE_IDENTITY: TelegramIdentity = {
    providerUserId: 'e2e-telegram-user',
    username: 'e2e_telegram',
    displayName: 'E2E Telegram',
};

// Carries only the nonce through the loop-back — everything else the real
// callback logic needs (state, transaction lookup, PKCE) is exercised for
// real; only the provider hop itself is faked.
const encodeTestModeCode = (nonce: string) => Buffer.from(JSON.stringify({ nonce })).toString('base64url');
const decodeTestModeCode = (code: string): { nonce: string } => JSON.parse(Buffer.from(code, 'base64url').toString('utf8'));

const requireConfig = () => {
    const clientId = telegramOidcClientId();
    const clientSecret = telegramOidcClientSecret();
    const redirectUri = telegramOidcRedirectUri();
    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error('TELEGRAM_OIDC_CLIENT_ID, TELEGRAM_OIDC_CLIENT_SECRET and TELEGRAM_OIDC_REDIRECT_URI are required');
    }
    return { clientId, clientSecret, redirectUri };
};

export const generateState = () => crypto.randomBytes(32).toString('base64url');
export const generateNonce = () => crypto.randomBytes(32).toString('base64url');

// RFC 7636 code_verifier: 43-128 chars from the unreserved set — base64url of 64
// random bytes lands comfortably inside that range.
export const generatePkceVerifier = () => crypto.randomBytes(64).toString('base64url');
export const derivePkceChallenge = (verifier: string) => crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');

interface BuildAuthorizationUrlInput {
    state: string;
    nonce: string;
    codeChallenge: string;
}

export const buildAuthorizationUrl = ({ state, nonce, codeChallenge }: BuildAuthorizationUrlInput) => {
    const { clientId, redirectUri } = requireConfig();

    if (isOidcTestMode()) {
        const url = new URL(redirectUri);
        url.searchParams.set('code', encodeTestModeCode(nonce));
        url.searchParams.set('state', state);
        return url.toString();
    }

    const url = new URL(AUTHORIZATION_ENDPOINT);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid profile');
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');

    return url.toString();
};

interface TokenResponse {
    id_token: string;
    access_token?: string;
    token_type?: string;
    expires_in?: number;
}

// Confidential client — client_secret never leaves the server, matches how
// service.Payments.Auth.ts exchanges Mollie's authorization code.
const exchangeCodeForTokens = async (code: string, codeVerifier: string): Promise<TokenResponse> => {
    const { clientId, clientSecret, redirectUri } = requireConfig();

    const response = await axios.post<TokenResponse>(
        TOKEN_ENDPOINT,
        new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            code_verifier: codeVerifier,
        }),
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            },
        },
    );

    return response.data;
};

export interface TelegramIdentity {
    providerUserId: string;
    username: string | null;
    displayName: string | null;
}

// jose covers exactly the piece the spec insists on a maintained library for:
// signature (against Telegram's JWKS), issuer, audience and expiry validation.
// Nonce is the one check jose doesn't do — verified by the caller separately
// (it needs the stored per-transaction nonce, which this module doesn't hold).
const verifyIdToken = async (idToken: string): Promise<{ identity: TelegramIdentity; nonce: string | undefined }> => {
    const { clientId } = requireConfig();

    const { payload } = await jwtVerify(idToken, getJwks(), {
        issuer: ISSUER,
        audience: clientId,
    });

    if (typeof payload.sub !== 'string' || !payload.sub) {
        throw new Error('Telegram ID token is missing sub');
    }

    return {
        identity: {
            providerUserId: payload.sub,
            username: typeof payload.preferred_username === 'string' ? payload.preferred_username : null,
            displayName: typeof payload.name === 'string' ? payload.name : null,
        },
        nonce: typeof payload.nonce === 'string' ? payload.nonce : undefined,
    };
};

export const completeAuthorizationCodeExchange = async (code: string, codeVerifier: string) => {
    if (isOidcTestMode()) {
        const { nonce } = decodeTestModeCode(code);
        return { identity: TEST_MODE_IDENTITY, nonce };
    }

    const tokens = await exchangeCodeForTokens(code, codeVerifier);
    return verifyIdToken(tokens.id_token);
};
