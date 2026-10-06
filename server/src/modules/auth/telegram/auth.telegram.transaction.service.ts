import crypto from 'crypto';
import dayjs from 'dayjs';
import { TelegramAuthFlow } from '@prisma/client';
import prisma from '../../../../prisma/prisma-client';
import { timingSafeEqualStrings } from '../../../common/utils/crypto';
import {
    derivePkceChallenge,
    generateNonce,
    generatePkceVerifier,
    generateState,
} from './auth.telegram.oidc-client';

const TRANSACTION_TTL_MINUTES = 5;

// Same fallback chain as service.Token.ts's sessionSecret() and
// service.TwoFactor.ts's twoFactorSecret() — kept as its own copy rather than a
// shared export, consistent with how those two already duplicate it.
const transactionSecret = () => process.env.SESSION_TOKEN_SECRET || process.env.JWT_REFRESH_SECRET || process.env.JWT_ACCESS_SECRET;

export const hashTelegramNonce = (nonce: string) => {
    const secret = transactionSecret();
    if (!secret) {
        throw new Error('SESSION_TOKEN_SECRET or JWT_REFRESH_SECRET is required');
    }
    return crypto.createHmac('sha256', secret).update(`telegram-oidc-nonce:${nonce}`).digest('hex');
};

interface CreateTransactionInput {
    flow: TelegramAuthFlow;
    userId?: number;
}

// Sweeps this user's own stale/expired rows on every LINK creation and always
// sweeps globally-expired rows — same opportunistic cleanup connectMollieController
// does for MollieOAuthState, no dedicated cron needed for a table this small.
export const createTelegramAuthTransaction = async ({ flow, userId }: CreateTransactionInput) => {
    const state = generateState();
    const nonce = generateNonce();
    const codeVerifier = generatePkceVerifier();
    const codeChallenge = derivePkceChallenge(codeVerifier);
    const expiresAt = dayjs().add(TRANSACTION_TTL_MINUTES, 'minute').toDate();

    await prisma.telegramAuthTransaction.deleteMany({
        where: {
            OR: [
                userId ? { userId } : undefined,
                { expiresAt: { lt: new Date() } },
            ].filter(Boolean) as Array<{ userId: number } | { expiresAt: { lt: Date } }>,
        },
    });

    await prisma.telegramAuthTransaction.create({
        data: {
            state,
            nonceHash: hashTelegramNonce(nonce),
            codeVerifier,
            flow,
            userId: userId ?? null,
            expiresAt,
        },
    });

    return { state, nonce, codeChallenge, expiresAt };
};

export type TelegramTransactionFailureReason = 'NOT_FOUND' | 'EXPIRED';
export type ConsumeTelegramTransactionResult =
    | {
        ok: true;
        flow: TelegramAuthFlow;
        userId: number | null;
        codeVerifier: string;
        nonceHash: string;
    }
    | { ok: false; reason: TelegramTransactionFailureReason };

// Marks the row consumed in the same update that reads it — updateMany's count
// is the concurrency guard (mirrors service.Token.ts's replaceToken transaction
// pattern), so two requests racing on the same state can't both succeed.
export const consumeTelegramAuthTransaction = async (state: string | undefined): Promise<ConsumeTelegramTransactionResult> => {
    if (!state) return { ok: false, reason: 'NOT_FOUND' };

    const transaction = await prisma.telegramAuthTransaction.findUnique({ where: { state } });
    if (!transaction || transaction.consumedAt) {
        return { ok: false, reason: 'NOT_FOUND' };
    }
    if (transaction.expiresAt <= new Date()) {
        return { ok: false, reason: 'EXPIRED' };
    }

    const updated = await prisma.telegramAuthTransaction.updateMany({
        where: { id: transaction.id, consumedAt: null },
        data: { consumedAt: new Date() },
    });
    if (updated.count !== 1) {
        return { ok: false, reason: 'NOT_FOUND' };
    }

    return {
        ok: true,
        flow: transaction.flow,
        userId: transaction.userId,
        codeVerifier: transaction.codeVerifier,
        nonceHash: transaction.nonceHash,
    };
};

export const verifyTelegramNonce = (nonce: string | undefined, nonceHash: string) => {
    if (!nonce) return false;
    return timingSafeEqualStrings(hashTelegramNonce(nonce), nonceHash);
};
