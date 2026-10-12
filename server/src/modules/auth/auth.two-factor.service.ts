import crypto from 'node:crypto';
import dayjs from 'dayjs';
import { TwoFactorChannel } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { createEmailProvider } from '../../integrations/email/factory';
import { decryptCredentials } from '../providers/providers.service';
import { sessionSecret } from './auth.service';

export const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const MAX_RESENDS = 3;
const RESEND_COOLDOWN_SECONDS = 60;
export const TRUSTED_DEVICE_DAYS = 30;

// The session secret is deliberately reused rather than a new env var: a 2FA code and a
// session token need the same "server-only secret, never rotated casually" property.
const hmac = (namespace: string, value: string) =>
    crypto.createHmac('sha256', sessionSecret()).update(`${namespace}:${value}`).digest('hex');

export const generateOpaqueToken = () => crypto.randomBytes(32).toString('base64url');
export const generateSixDigitCode = () => crypto.randomInt(100000, 1000000).toString();

export const hashTwoFactorToken = (token: string) => hmac('2fa-token', token);
export const hashTwoFactorCode = (code: string) => hmac('2fa-code', code);

// Constant-time compare: a 6-digit code has only 1e6 combinations, so even a small timing
// leak on string comparison is worth closing.
export const verifyCode = (code: string, codeHash: string) => {
    const candidate = Buffer.from(hashTwoFactorCode(code));
    const expected = Buffer.from(codeHash);
    return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
};

const buildCodeEmail = (code: string) => ({
    subject: 'Login confirmation code — HHDC CRM',
    text: `Your confirmation code: ${code}\n\nThe code is valid for ${CODE_TTL_MINUTES} minutes. If it was not you who tried to sign in, just ignore this email.`,
    html: `
        <p>Your confirmation code for signing in to HHDC CRM:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px;">${code}</p>
        <p>The code is valid for ${CODE_TTL_MINUTES} minutes. If it was not you who tried to sign in, just ignore this email.</p>
    `,
});

const findSenderConnection = async (sender: string) => {
    const connection = await prisma.providerConnection.findFirst({
        where: { type: 'EMAIL', status: { not: 'DISABLED' }, settings: { path: ['sender'], equals: sender } },
    });
    if (!connection) {
        throw new Error(`Email connection "${sender}" (TWO_FACTOR_SENDER_EMAIL) not found or disabled`);
    }
    return connection;
};

// Deliberately bypasses the communications module: that path stores a Message and shows it in
// the mail workspace, which would mix security codes into customer correspondence. This sends
// straight through the mailbox provider, without persisting anything.
const sendTwoFactorCodeEmail = async (toEmail: string, code: string) => {
    const sender = process.env.TWO_FACTOR_SENDER_EMAIL?.trim().toLowerCase();
    if (!sender) {
        throw new Error('TWO_FACTOR_SENDER_EMAIL is not configured');
    }

    const connection = await findSenderConnection(sender);
    const credentials = connection.credentialsEncrypted ? decryptCredentials(connection.credentialsEncrypted) : {};
    const provider = createEmailProvider({ provider: connection.provider, credentials, settings: connection.settings });

    const { subject, text, html } = buildCodeEmail(code);
    await provider.sendMessage({ sender, recipient: toEmail, subject, content: text, html });
};

interface CreateChallengeInput {
    userId: string;
    email: string;
    ipAddress?: string;
    userAgent?: string | null;
}

// Sends the email first and only persists the challenge if that succeeds — an unreachable
// mail server should fail the login attempt cleanly, not leave a pending cookie referencing
// a code the user can never receive.
export const createTwoFactorChallenge = async ({ userId, email, ipAddress, userAgent }: CreateChallengeInput) => {
    const rawToken = generateOpaqueToken();
    const code = generateSixDigitCode();
    const expiresAt = dayjs().add(CODE_TTL_MINUTES, 'minute').toDate();

    await sendTwoFactorCodeEmail(email, code);

    await prisma.twoFactorChallenge.create({
        data: {
            userId,
            channel: TwoFactorChannel.EMAIL,
            tokenHash: hashTwoFactorToken(rawToken),
            codeHash: hashTwoFactorCode(code),
            maxAttempts: MAX_ATTEMPTS,
            ipAddress,
            userAgent: userAgent ?? undefined,
            expiresAt,
        },
    });

    return { rawToken, expiresAt };
};

export type TwoFactorVerifyFailureReason = 'NOT_FOUND' | 'EXPIRED' | 'LOCKED' | 'INVALID_CODE';
export type TwoFactorVerifyResult =
    | { ok: true; userId: string }
    | { ok: false; reason: TwoFactorVerifyFailureReason };

export const verifyTwoFactorChallenge = async (rawToken: string, code: string): Promise<TwoFactorVerifyResult> => {
    if (!rawToken) return { ok: false, reason: 'NOT_FOUND' };

    const challenge = await prisma.twoFactorChallenge.findUnique({
        where: { tokenHash: hashTwoFactorToken(rawToken) },
    });

    if (!challenge || challenge.consumedAt) {
        return { ok: false, reason: 'NOT_FOUND' };
    }
    if (challenge.expiresAt <= new Date()) {
        return { ok: false, reason: 'EXPIRED' };
    }
    if (challenge.attempts >= challenge.maxAttempts) {
        return { ok: false, reason: 'LOCKED' };
    }

    if (!verifyCode(code, challenge.codeHash)) {
        const updated = await prisma.twoFactorChallenge.update({
            where: { id: challenge.id },
            data: { attempts: { increment: 1 } },
        });
        return { ok: false, reason: updated.attempts >= updated.maxAttempts ? 'LOCKED' : 'INVALID_CODE' };
    }

    await prisma.twoFactorChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
    });

    return { ok: true, userId: challenge.userId };
};

export type TwoFactorResendFailureReason = 'NOT_FOUND' | 'EXPIRED' | 'LOCKED' | 'TOO_MANY_RESENDS' | 'COOLDOWN';
export type TwoFactorResendResult =
    | { ok: true }
    | { ok: false; reason: TwoFactorResendFailureReason; retryAfterSeconds?: number };

type ResendableChallenge = { consumedAt: Date | null; expiresAt: Date; attempts: number; maxAttempts: number; resendCount: number; updatedAt: Date; user: { isActive: boolean } };

// Why this challenge cannot get a new code right now; null when it can.
const resendRefusal = (challenge: ResendableChallenge | null): Exclude<TwoFactorResendResult, { ok: true }> | null => {
    if (!challenge || challenge.consumedAt || !challenge.user.isActive) return { ok: false, reason: 'NOT_FOUND' };
    if (challenge.expiresAt <= new Date()) return { ok: false, reason: 'EXPIRED' };
    if (challenge.attempts >= challenge.maxAttempts) return { ok: false, reason: 'LOCKED' };
    if (challenge.resendCount >= MAX_RESENDS) return { ok: false, reason: 'TOO_MANY_RESENDS' };

    const cooldownEndsAt = dayjs(challenge.updatedAt).add(RESEND_COOLDOWN_SECONDS, 'second');
    if (dayjs().isBefore(cooldownEndsAt)) {
        return { ok: false, reason: 'COOLDOWN', retryAfterSeconds: cooldownEndsAt.diff(dayjs(), 'second') };
    }
    return null;
};

// Looks up the target email itself via the challenge's user relation rather than accepting
// it as a parameter — the caller has no session yet, so it must not be trusted to say where
// the code should go.
export const resendTwoFactorChallenge = async (rawToken: string): Promise<TwoFactorResendResult> => {
    if (!rawToken) return { ok: false, reason: 'NOT_FOUND' };

    const challenge = await prisma.twoFactorChallenge.findUnique({
        where: { tokenHash: hashTwoFactorToken(rawToken) },
        include: { user: { select: { email: true, isActive: true } } },
    });

    const refusal = resendRefusal(challenge);
    if (refusal || !challenge) return refusal ?? { ok: false, reason: 'NOT_FOUND' };

    const code = generateSixDigitCode();
    await sendTwoFactorCodeEmail(challenge.user.email, code);

    await prisma.twoFactorChallenge.update({
        where: { id: challenge.id },
        data: {
            codeHash: hashTwoFactorCode(code),
            expiresAt: dayjs().add(CODE_TTL_MINUTES, 'minute').toDate(),
            resendCount: { increment: 1 },
        },
    });

    return { ok: true };
};

interface CreateTrustedDeviceInput {
    userId: string;
    ipAddress?: string;
    userAgent?: string | null;
}

export const createTrustedDevice = async ({ userId, ipAddress, userAgent }: CreateTrustedDeviceInput) => {
    const rawToken = generateOpaqueToken();
    const expiresAt = dayjs().add(TRUSTED_DEVICE_DAYS, 'day').toDate();

    await prisma.trustedDevice.create({
        data: {
            userId,
            tokenHash: hashTwoFactorToken(rawToken),
            ipAddress,
            userAgent: userAgent ?? undefined,
            expiresAt,
        },
    });

    return { rawToken, expiresAt };
};

// Bound to a specific userId so a trusted-device cookie for one account can't be replayed to
// skip 2FA on a different account (e.g. two admins sharing a browser).
export const isTrustedDeviceValid = async (rawToken: string | undefined, userId: string): Promise<boolean> => {
    if (!rawToken) return false;

    const device = await prisma.trustedDevice.findUnique({
        where: { tokenHash: hashTwoFactorToken(rawToken) },
    });

    if (!device || device.userId !== userId || device.revokedAt || device.expiresAt <= new Date()) {
        return false;
    }

    await prisma.trustedDevice.update({
        where: { id: device.id },
        data: { lastUsedAt: new Date() },
    });

    return true;
};
