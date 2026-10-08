import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import {
    buildAuthorizeUrl, createState, exchangeCode, fetchProfile, isValidState, needsRefresh, parseRedirect, refreshGrant, weeztixConfig,
    type WeeztixCompany, type WeeztixGrant, type WeeztixTokens,
} from '../../integrations/ticketing/weeztix/weeztix.oauth';
import { decryptCredentials, encryptCredentials, safeProviderSelect } from '../providers/providers.service';

export const connectSchema = z.object({
    address: z.string().trim().min(1).max(4000),
    // The state of the authorization this browser started; needed when only the code is pasted.
    state: z.string().trim().max(500).optional(),
    companyGuid: z.string().trim().max(100).optional(),
}).strict();

// The address the staff member opens in Weeztix to approve access.
export const startWeeztixAuthorization = (userId: string): { url: string; redirectUri: string; state: string } => {
    const config = weeztixConfig();
    const state = createState(userId);
    return { url: buildAuthorizeUrl(config, state), redirectUri: config.redirectUri, state };
};

// One company is active per connection; the others the token can reach are kept for choosing later.
export const chooseCompany = (companies: WeeztixCompany[], wanted?: string): WeeztixCompany | null => {
    if (wanted) {
        const match = companies.find(company => company.guid === wanted);
        if (!match) throw new ApiError(400, 'WEEZTIX_COMPANY_UNKNOWN', 'This Weeztix account has no access to that company');
        return match;
    }
    return companies[0] ?? null;
};

const connectionSettings = (grant: WeeztixGrant, company: WeeztixCompany | null): Prisma.InputJsonObject => ({
    companyGuid: company?.guid ?? '', companyName: company?.name ?? '',
    companies: grant.companies.map(item => ({ guid: item.guid, name: item.name })),
});

const connectedFields = () => ({ status: 'CONNECTED' as const, lastAttemptAt: new Date(), lastSuccessAt: new Date(), lastError: null as string | null });

// There is one Weeztix connection: connecting again replaces its tokens instead of adding a second one.
const saveGrant = async (grant: WeeztixGrant, company: WeeztixCompany | null) => {
    const data = { credentialsEncrypted: encryptCredentials({ ...grant.tokens }), settings: connectionSettings(grant, company), ...connectedFields() };
    const existing = await prisma.providerConnection.findFirst({ where: { provider: 'WEEZTIX' }, select: { id: true } });
    return existing
        ? prisma.providerConnection.update({ where: { id: existing.id }, data, select: safeProviderSelect })
        : prisma.providerConnection.create({ data: { name: 'Weeztix', type: 'TICKETING', provider: 'WEEZTIX', ...data }, select: safeProviderSelect });
};

export const completeWeeztixAuthorization = async (input: z.infer<typeof connectSchema>, userId: string) => {
    const answer = parseRedirect(input.address, input.state);
    if (!isValidState(answer.state, userId)) throw new ApiError(400, 'WEEZTIX_STATE_INVALID', 'This address does not belong to the connection you started, or it is older than 15 minutes. Start again');
    const grant = await exchangeCode(weeztixConfig(), answer.code);
    return saveGrant(grant, chooseCompany(grant.companies, input.companyGuid));
};

const TOKEN_FIELDS = z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1), accessExpiresAt: z.string(), refreshExpiresAt: z.string() });

const readTokens = (encrypted: string | null): WeeztixTokens => {
    const parsed = TOKEN_FIELDS.safeParse(encrypted ? decryptCredentials(encrypted) : {});
    if (!parsed.success) throw new ApiError(409, 'WEEZTIX_NOT_CONNECTED', 'Weeztix is not connected. Connect it in Providers');
    return parsed.data as WeeztixTokens;
};

// A refresh token can be used once, so two requests must never refresh at the same time: the row
// is locked, the tokens are read again under the lock, and the new pair is stored before it is used.
const refreshUnderLock = (connectionId: string) => prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<Array<{ credentialsEncrypted: string | null }>>`SELECT "credentialsEncrypted" FROM "ProviderConnection" WHERE "id" = ${connectionId}::uuid FOR UPDATE`;
    const current = readTokens(rows[0]?.credentialsEncrypted ?? null);
    if (!needsRefresh(current)) return current.accessToken;
    const grant = await refreshGrant(weeztixConfig(), current.refreshToken);
    await tx.providerConnection.update({ where: { id: connectionId }, data: { credentialsEncrypted: encryptCredentials({ ...grant.tokens }) } });
    return grant.tokens.accessToken;
}, { timeout: 30_000 });

const requireWeeztix = async (connectionId: string) => {
    const connection = await prisma.providerConnection.findUnique({ where: { id: connectionId }, select: { id: true, provider: true, credentialsEncrypted: true, settings: true } });
    if (!connection || connection.provider !== 'WEEZTIX') throw new ApiError(404, 'PROVIDER_NOT_FOUND', 'Weeztix connection not found');
    return connection;
};

// A token that is valid right now, refreshed first when it is about to expire.
export const getWeeztixAccessToken = async (connectionId: string): Promise<string> => {
    const connection = await requireWeeztix(connectionId);
    const tokens = readTokens(connection.credentialsEncrypted);
    return needsRefresh(tokens) ? refreshUnderLock(connectionId) : tokens.accessToken;
};

const recordOutcome = (connectionId: string, error: string | null) => prisma.providerConnection.update({
    where: { id: connectionId }, select: safeProviderSelect,
    data: error
        ? { status: 'ERROR', lastAttemptAt: new Date(), lastFailureAt: new Date(), lastError: error }
        : connectedFields(),
});

// Proves the stored access still works by asking Weeztix who the token belongs to.
export const checkWeeztixConnection = async (connectionId: string) => {
    try {
        const profile = await fetchProfile(await getWeeztixAccessToken(connectionId));
        return { success: true, error: null as string | null, account: profile, provider: await recordOutcome(connectionId, null) };
    } catch (error) {
        const reason = (error instanceof Error ? error.message : 'Unknown error').slice(0, 300);
        return { success: false, error: reason, account: null, provider: await recordOutcome(connectionId, reason) };
    }
};

// The company whose data is read; chosen when Weeztix was connected.
export const readWeeztixCompanyGuid = async (connectionId: string): Promise<string> => {
    const connection = await prisma.providerConnection.findUnique({ where: { id: connectionId }, select: { provider: true, settings: true } });
    if (!connection || connection.provider !== 'WEEZTIX') throw new ApiError(404, 'PROVIDER_NOT_FOUND', 'Weeztix connection not found');
    const companyGuid = z.object({ companyGuid: z.string().min(1) }).safeParse(connection.settings);
    if (!companyGuid.success) throw new ApiError(409, 'WEEZTIX_COMPANY_MISSING', 'No Weeztix company is chosen for this connection. Connect Weeztix again');
    return companyGuid.data.companyGuid;
};

// What the last sync ended with, shown on the provider card. A failed sync does not disconnect
// Weeztix: the access may be fine while the data could not be read.
export const recordWeeztixSync = (connectionId: string, error: string | null) => prisma.providerConnection.update({
    where: { id: connectionId }, select: { id: true },
    data: error
        ? { lastAttemptAt: new Date(), lastFailureAt: new Date(), lastError: error }
        : { lastAttemptAt: new Date(), lastSyncAt: new Date(), lastSuccessAt: new Date(), lastError: null },
});
