import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import axios from 'axios';
import { createMollieClient, MollieClient } from '@mollie/api-client';
import prisma from '../../../prisma/prisma-client';
import { getMollieTokenExpiresAt } from './payments.utils.service';

export { getMollieTokenExpiresAt } from './payments.utils.service';

const TOKEN_VERSION = 'v1';
const REFRESH_WINDOW_MS = 5 * 60 * 1000;

interface MollieTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    expires_at?: string | number;
    scope?: string;
}

const getEncryptionKey = () => {
    const secret = process.env.MOLLIE_TOKEN_ENCRYPTION_KEY ?? process.env.MOLLIE_CLIENT_SECRET;

    if (!secret) {
        throw new Error('MOLLIE_TOKEN_ENCRYPTION_KEY or MOLLIE_CLIENT_SECRET is required');
    }

    return createHash('sha256').update(secret).digest();
};

const encryptMollieToken = (value: string) => {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [TOKEN_VERSION, iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join('.');
};

const decryptMollieToken = (value: string) => {
    const [version, iv, authTag, encrypted] = value.split('.');

    if (version !== TOKEN_VERSION || !iv || !authTag || !encrypted) {
        throw new Error('Unsupported Mollie token format');
    }

    const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    return Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'base64')),
        decipher.final(),
    ]).toString('utf8');
};

export const saveMollieAccount = async (userId: number, token: MollieTokenResponse) => {
    if (!token.refresh_token) {
        throw new Error('Mollie did not return a refresh token');
    }

    return prisma.mollieAccount.upsert({
        where: { userId },
        update: {
            accessTokenEncrypted: encryptMollieToken(token.access_token),
            refreshTokenEncrypted: encryptMollieToken(token.refresh_token),
            expiresAt: getMollieTokenExpiresAt(token),
            scope: token.scope ?? null,
            isActive: true,
        },
        create: {
            userId,
            accessTokenEncrypted: encryptMollieToken(token.access_token),
            refreshTokenEncrypted: encryptMollieToken(token.refresh_token),
            expiresAt: getMollieTokenExpiresAt(token),
            scope: token.scope ?? null,
        },
    });
};

const refreshMollieAccount = async (account: {
    id: number;
    refreshTokenEncrypted: string;
}) => {
    const clientId = process.env.MOLLIE_CLIENT_ID;
    const clientSecret = process.env.MOLLIE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('MOLLIE_CLIENT_ID and MOLLIE_CLIENT_SECRET are required to refresh OAuth token');
    }

    const response = await axios.post<MollieTokenResponse>(
        'https://api.mollie.com/oauth2/tokens',
        new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: decryptMollieToken(account.refreshTokenEncrypted),
        }),
        {
            auth: {
                username: clientId,
                password: clientSecret,
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        },
    );

    const refreshToken = response.data.refresh_token
        ?? decryptMollieToken(account.refreshTokenEncrypted);

    return prisma.mollieAccount.update({
        where: { id: account.id },
        data: {
            accessTokenEncrypted: encryptMollieToken(response.data.access_token),
            refreshTokenEncrypted: encryptMollieToken(refreshToken),
            expiresAt: getMollieTokenExpiresAt(response.data),
            scope: response.data.scope,
            isActive: true,
            lastRefreshedAt: new Date(),
        },
    });
};

export const getMollieClient = async (): Promise<MollieClient> => {
    let account = await prisma.mollieAccount.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
    });

    if (account && account.expiresAt.getTime() <= Date.now() + REFRESH_WINDOW_MS) {
        try {
            account = await refreshMollieAccount(account);
        } catch (error) {
            await prisma.mollieAccount.update({
                where: { id: account.id },
                data: { isActive: false },
            });
            console.error('Failed to refresh Mollie OAuth token:', error);
            account = null;
        }
    }

    if (account) {
        return createMollieClient({
            accessToken: decryptMollieToken(account.accessTokenEncrypted),
        });
    }

    const apiKey = process.env.MOLLIE_API_KEY ?? process.env.MOLLIE_API_KEY_LIVE;

    if (!apiKey) {
        throw new Error('No active Mollie OAuth account or MOLLIE_API_KEY configured');
    }

    return createMollieClient({ apiKey });
};
