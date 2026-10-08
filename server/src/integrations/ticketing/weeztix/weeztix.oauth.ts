import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { ApiError } from '../../../common/http';

// OAuth2 Authorization Code flow of Weeztix (https://docs.weeztix.com/docs/introduction/authentication/).
// Pure helpers plus two HTTP calls; nothing here touches the database.

export interface WeeztixConfig { clientId: string; clientSecret: string; redirectUri: string }

const LOGIN_URL = 'https://login.weeztix.com/login';
const TOKEN_URL = 'https://auth.weeztix.com/tokens';
const PROFILE_URL = 'https://auth.weeztix.com/users/me';
const STATE_TTL_MS = 15 * 60_000;

export const weeztixConfig = (env: NodeJS.ProcessEnv = process.env): WeeztixConfig => {
    const config = { clientId: env.WEEZTIX_CLIENT_ID ?? '', clientSecret: env.WEEZTIX_CLIENT_SECRET ?? '', redirectUri: env.WEEZTIX_REDIRECT_URI ?? '' };
    if (!config.clientId || !config.clientSecret || !config.redirectUri) throw new ApiError(503, 'WEEZTIX_NOT_CONFIGURED', 'Weeztix OAuth client is not configured on the server');
    return config;
};

const stateKey = (env: NodeJS.ProcessEnv): Buffer => {
    const key = Buffer.from(env.APP_ENCRYPTION_KEY ?? '', 'base64');
    if (key.length !== 32) throw new ApiError(503, 'ENCRYPTION_NOT_CONFIGURED', 'Provider encryption is not configured');
    return key;
};

const sign = (payload: string, env: NodeJS.ProcessEnv): string => createHmac('sha256', stateKey(env)).update(`weeztix-oauth:${payload}`).digest('base64url');

// The state ties the answer from Weeztix to the staff member who started the connection and
// expires quickly. It is signed, so nothing has to be stored between the two steps.
export const createState = (userId: string, now = Date.now(), env: NodeJS.ProcessEnv = process.env): string => {
    const payload = `${userId}.${now + STATE_TTL_MS}.${randomBytes(9).toString('base64url')}`;
    return `${Buffer.from(payload).toString('base64url')}.${sign(payload, env)}`;
};

const sameSignature = (a: string, b: string): boolean => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const isValidState = (state: string, userId: string, now = Date.now(), env: NodeJS.ProcessEnv = process.env): boolean => {
    const [encoded, signature, ...rest] = state.split('.');
    if (!encoded || !signature || rest.length) return false;
    const payload = Buffer.from(encoded, 'base64url').toString('utf8');
    const [owner, expiresAt] = payload.split('.');
    return sameSignature(signature, sign(payload, env)) && owner === userId && Number(expiresAt) > now;
};

export const buildAuthorizeUrl = (config: WeeztixConfig, state: string): string => {
    const url = new URL(LOGIN_URL);
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', config.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('state', state);
    return url.toString();
};

export interface AuthorizationAnswer { code: string; state: string }

const BARE_CODE = /^[A-Za-z0-9._~-]{20,}$/;

const asUrl = (value: string): URL | null => {
    try { return new URL(value); } catch { return null; }
};

// Reads what the person brought back from Weeztix: the whole address of the page they were
// returned to, or just the code from it. A bare code has no state of its own, so the state of
// the connection that was started has to come with it.
export const parseRedirect = (pasted: string, startedState = ''): AuthorizationAnswer => {
    const value = pasted.trim();
    const url = asUrl(value);
    if (!url) {
        if (BARE_CODE.test(value) && startedState) return { code: value, state: startedState };
        throw new ApiError(400, 'WEEZTIX_ADDRESS_INVALID', 'Paste the whole address of the page Weeztix returned you to, or the code from it');
    }
    if (url.searchParams.get('error')) throw new ApiError(400, 'WEEZTIX_ACCESS_DECLINED', 'Access was not granted in Weeztix');
    const code = url.searchParams.get('code') ?? '';
    const state = url.searchParams.get('state') ?? '';
    if (!code || !state) throw new ApiError(400, 'WEEZTIX_ADDRESS_INVALID', 'The address has no authorization code. Copy it right after approving access');
    return { code, state };
};

export interface WeeztixCompany { guid: string; name: string }
export interface WeeztixTokens { accessToken: string; refreshToken: string; accessExpiresAt: string; refreshExpiresAt: string }
export interface WeeztixGrant { tokens: WeeztixTokens; companies: WeeztixCompany[] }

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const record = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' ? value as Record<string, unknown> : {});

// Weeztix describes `info.companies` only in words, so both a list and a map by GUID are read.
export const readCompanies = (info: unknown): WeeztixCompany[] => {
    const companies = record(info).companies;
    const entries: Array<[string, unknown]> = Array.isArray(companies) ? companies.map(item => ['', item]) : Object.entries(record(companies));
    return entries
        .map(([key, value]) => ({ guid: text(record(value).guid) || key, name: text(record(value).name) }))
        .filter(company => company.guid);
};

const SECOND_MS = 1000;

export const toGrant = (response: unknown, now = Date.now()): WeeztixGrant => {
    const body = record(response);
    const accessToken = text(body.access_token);
    const refreshToken = text(body.refresh_token);
    if (!accessToken || !refreshToken) throw new ApiError(502, 'WEEZTIX_TOKEN_REJECTED', 'Weeztix did not return a token');
    const lifetime = (seconds: unknown) => new Date(now + (Number(seconds) || 0) * SECOND_MS).toISOString();
    return {
        tokens: { accessToken, refreshToken, accessExpiresAt: lifetime(body.expires_in), refreshExpiresAt: lifetime(body.refresh_token_expires_in) },
        companies: readCompanies(body.info),
    };
};

type Fetch = typeof fetch;

// The reason is taken from the provider's answer but never includes the request, which holds the secret.
const failure = async (response: Response): Promise<string> => {
    const body = record(await response.json().catch((): null => null));
    return (text(body.error_description) || text(body.message) || text(body.error) || `HTTP ${response.status}`).slice(0, 200);
};

const requestGrant = async (payload: Record<string, string>, fetchImpl: Fetch): Promise<WeeztixGrant> => {
    const response = await fetchImpl(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) throw new ApiError(502, 'WEEZTIX_TOKEN_REJECTED', `Weeztix refused the request: ${await failure(response)}`);
    return toGrant(await response.json());
};

export const exchangeCode = (config: WeeztixConfig, code: string, fetchImpl: Fetch = fetch): Promise<WeeztixGrant> => requestGrant({
    grant_type: 'authorization_code', client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, code,
}, fetchImpl);

// A refresh token works once: the answer carries the next one, which has to be stored.
export const refreshGrant = (config: WeeztixConfig, refreshToken: string, fetchImpl: Fetch = fetch): Promise<WeeztixGrant> => requestGrant({
    grant_type: 'refresh_token', client_id: config.clientId, client_secret: config.clientSecret, refresh_token: refreshToken,
}, fetchImpl);

export interface WeeztixProfile { name: string; email: string }

export const fetchProfile = async (accessToken: string, fetchImpl: Fetch = fetch): Promise<WeeztixProfile> => {
    const response = await fetchImpl(PROFILE_URL, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
    if (!response.ok) throw new ApiError(502, 'WEEZTIX_UNAVAILABLE', `Weeztix did not accept the token: ${await failure(response)}`);
    const body = record(await response.json());
    return { name: text(body.name), email: text(body.email) };
};

const REFRESH_MARGIN_MS = 5 * 60_000;
export const needsRefresh = (tokens: Pick<WeeztixTokens, 'accessExpiresAt'>, now = Date.now()): boolean => new Date(tokens.accessExpiresAt).getTime() - now < REFRESH_MARGIN_MS;
