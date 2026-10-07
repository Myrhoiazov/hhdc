import { Prisma, type ProviderConnection } from '@prisma/client';
import type { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { createEmailProvider } from '../../integrations/email/factory';
import { MolliePaymentProvider } from '../../integrations/payment/mollie.provider';
import { decryptCredentials, encryptCredentials, providerSchema, safeProviderSelect, validateProviderType } from './providers.service';

type ProviderInput = z.infer<typeof providerSchema>;
type Settings = Record<string, unknown>;

export interface ConnectionConfig {
    type: string;
    provider: string;
    credentials: Record<string, string>;
    settings: Settings;
}

type ConnectionTester = (config: ConnectionConfig) => Promise<unknown>;

// Provider types whose adapters can prove that the stored credentials actually work.
const TESTERS: Record<string, ConnectionTester> = {
    EMAIL: config => createEmailProvider(config).testConnection(),
    PAYMENT: config => new MolliePaymentProvider(config.credentials).testConnection(),
};

export const canTestConnection = (type: string): boolean => type in TESTERS;

const failureReason = (error: unknown) => (error instanceof Error ? error.message : 'Unknown error').slice(0, 300);

// Resolves to null when the connection works, otherwise to the reason it does not.
export const probeConnection = async (config: ConnectionConfig, testers: Record<string, ConnectionTester> = TESTERS): Promise<string | null> => {
    try {
        await testers[config.type](config);
        return null;
    } catch (error) {
        return failureReason(error);
    }
};

// A mailbox sends from its own login unless a different sender address was configured.
export const withDefaultSender = (config: ConnectionConfig): Settings => {
    const username = config.credentials.username ?? '';
    const needsSender = config.provider === 'IMAP' && !config.settings.sender && username.includes('@');
    return needsSender ? { ...config.settings, sender: username } : config.settings;
};

const assertConnects = async (config: ConnectionConfig) => {
    if (!canTestConnection(config.type)) return false;
    const failure = await probeConnection(config);
    if (failure) throw new ApiError(400, 'PROVIDER_CONNECTION_FAILED', `Could not connect with these settings: ${failure}`);
    return true;
};

const requireConnection = async (id: string): Promise<ProviderConnection> => {
    const connection = await prisma.providerConnection.findUnique({ where: { id } });
    if (!connection) throw new ApiError(404, 'PROVIDER_NOT_FOUND', 'Provider not found');
    return connection;
};

const storedConfig = (connection: ProviderConnection): ConnectionConfig => ({
    type: connection.type, provider: connection.provider,
    credentials: connection.credentialsEncrypted ? decryptCredentials(connection.credentialsEncrypted) : {},
    settings: (connection.settings ?? {}) as Settings,
});

const verifiedFields = (verified: boolean) => (verified
    ? { status: 'CONNECTED' as const, lastAttemptAt: new Date(), lastSuccessAt: new Date(), lastError: null }
    : {});

// Credentials are verified against the provider before they are stored, so a typo is
// reported in the form instead of surfacing later as a failed sync.
export const createConnection = async (input: ProviderInput) => {
    validateProviderType(input.provider, input.type);
    const config: ConnectionConfig = { type: input.type, provider: input.provider, credentials: input.credentials ?? {}, settings: input.settings ?? {} };
    const verified = Boolean(input.credentials) && await assertConnects(config);
    return prisma.providerConnection.create({
        data: {
            name: input.name, type: input.type, provider: input.provider, status: input.status,
            settings: withDefaultSender(config) as Prisma.InputJsonObject,
            credentialsEncrypted: input.credentials ? encryptCredentials(input.credentials) : undefined,
            ...verifiedFields(verified),
        },
        select: safeProviderSelect,
    });
};

const mergedConfig = (existing: ProviderConnection, input: Partial<ProviderInput>): ConnectionConfig => {
    const stored = storedConfig(existing);
    return {
        type: input.type ?? existing.type, provider: input.provider ?? existing.provider,
        credentials: input.credentials ?? stored.credentials,
        settings: { ...stored.settings, ...input.settings },
    };
};

export const updateConnection = async (id: string, input: Partial<ProviderInput>) => {
    const existing = await requireConnection(id);
    const config = mergedConfig(existing, input);
    validateProviderType(config.provider as ProviderInput['provider'], config.type as ProviderInput['type']);
    const reconfigured = Boolean(input.credentials || input.settings);
    const verified = reconfigured && await assertConnects(config);
    const provider = await prisma.providerConnection.update({
        where: { id },
        data: {
            name: input.name, type: input.type, provider: input.provider,
            settings: withDefaultSender(config) as Prisma.InputJsonObject,
            credentialsEncrypted: input.credentials ? encryptCredentials(input.credentials) : undefined,
            ...verifiedFields(verified),
            ...(input.status ? { status: input.status } : {}),
        },
        select: safeProviderSelect,
    });
    // The encrypted secret never reaches the audit trail.
    const { credentialsEncrypted: _secret, ...before } = existing;
    return { before, provider };
};

// Records the outcome on the connection; a disabled provider that passes the test is enabled again.
export const testConnection = async (id: string) => {
    const connection = await requireConnection(id);
    if (!canTestConnection(connection.type)) throw new ApiError(400, 'PROVIDER_TEST_UNSUPPORTED', 'Connection test is not available for this provider');
    const failure = await probeConnection(storedConfig(connection));
    const now = new Date();
    const provider = await prisma.providerConnection.update({
        where: { id },
        data: failure
            ? { status: 'ERROR', lastAttemptAt: now, lastFailureAt: now, lastError: failure }
            : { status: 'CONNECTED', lastAttemptAt: now, lastSuccessAt: now, lastError: null },
        select: safeProviderSelect,
    });
    return { success: !failure, error: failure, provider };
};

export const deleteConnection = async (id: string) => {
    await requireConnection(id);
    try {
        await prisma.providerConnection.delete({ where: { id } });
    } catch (error) {
        const inUse = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
        if (!inUse) throw error;
        throw new ApiError(409, 'PROVIDER_IN_USE', 'This provider already has synced data; disable it instead of deleting');
    }
    return { id };
};
