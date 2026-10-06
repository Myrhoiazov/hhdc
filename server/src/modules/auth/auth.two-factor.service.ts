import crypto from 'crypto';
import dayjs from 'dayjs';
import nodemailer from 'nodemailer';
import { TwoFactorChannel } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { decryptEmailSecret } from '../communication/email/email-crypto.service';

export const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const MAX_RESENDS = 3;
const RESEND_COOLDOWN_SECONDS = 60;
export const TRUSTED_DEVICE_DAYS = 30;

// Same fallback chain as service.Token.ts's sessionSecret() — deliberately reused
// rather than a new env var, since a 2FA code and a session token need the same
// "server-only secret, never rotated casually" security property.
const twoFactorSecret = () => process.env.SESSION_TOKEN_SECRET || process.env.JWT_REFRESH_SECRET || process.env.JWT_ACCESS_SECRET;

const hmac = (namespace: string, value: string) => {
    const secret = twoFactorSecret();
    if (!secret) {
        throw new Error('SESSION_TOKEN_SECRET or JWT_REFRESH_SECRET is required');
    }
    return crypto.createHmac('sha256', secret).update(`${namespace}:${value}`).digest('hex');
};

export const generateOpaqueToken = () => crypto.randomBytes(32).toString('base64url');
export const generateSixDigitCode = () => crypto.randomInt(100000, 1000000).toString();

export const hashTwoFactorToken = (token: string) => hmac('2fa-token', token);
export const hashTwoFactorCode = (code: string) => hmac('2fa-code', code);

// Constant-time compare — same reasoning as the dummy-hash check in controller.Auth.ts's
// login(): a 6-digit code has only 1e6 combinations, so even a small timing leak on
// string comparison is worth closing.
export const verifyCode = (code: string, codeHash: string) => {
    const candidate = Buffer.from(hashTwoFactorCode(code));
    const expected = Buffer.from(codeHash);
    return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
};

const buildCodeEmail = (code: string) => ({
    subject: 'Код подтверждения входа — HHDC Admin',
    text: `Ваш код подтверждения: ${code}\n\nКод действителен ${CODE_TTL_MINUTES} минут. Если вход пытались выполнить не вы — просто проигнорируйте это письмо.`,
    html: `
        <p>Ваш код подтверждения для входа в HHDC Admin:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px;">${code}</p>
        <p>Код действителен ${CODE_TTL_MINUTES} минут. Если вход пытались выполнить не вы — просто проигнорируйте это письмо.</p>
    `,
});

// Deliberately bypasses email-smtp.service.ts/composeEmail — that path writes an
// EmailMessage row and lands in the "Письма" module's inbox, which would mix
// security codes into client correspondence. This sends directly via nodemailer
// using the same EmailAccount SMTP credentials, without persisting anything.
const sendTwoFactorCodeEmail = async (toEmail: string, code: string) => {
    const senderUsername = process.env.TWO_FACTOR_SENDER_EMAIL;
    if (!senderUsername) {
        throw new Error('TWO_FACTOR_SENDER_EMAIL is not configured');
    }

    const account = await prisma.emailAccount.findFirst({
        where: { username: senderUsername, isActive: true },
    });
    if (!account) {
        throw new Error(`Email account "${senderUsername}" (TWO_FACTOR_SENDER_EMAIL) not found or inactive`);
    }

    const transporter = nodemailer.createTransport({
        host: account.smtpHost,
        port: account.smtpPort,
        secure: account.smtpSecure,
        auth: {
            user: account.username,
            pass: decryptEmailSecret(account.passwordEncrypted),
        },
    });

    const { subject, text, html } = buildCodeEmail(code);
    await transporter.sendMail({
        from: account.username,
        to: toEmail,
        subject,
        text,
        html,
    });
};

interface CreateChallengeInput {
    userId: number;
    email: string;
    ipAddress?: string;
    userAgent?: string | null;
}

// Sends the email first and only persists the challenge if that succeeds — an
// unreachable SMTP server should fail the login attempt cleanly, not leave a
// pending cookie referencing a code the user can never receive.
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
    | { ok: true; userId: number }
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

// Looks up the target email itself via the challenge's user relation rather than
// accepting it as a parameter — the caller has no session yet, so it must not be
// trusted to say where the code should go.
export const resendTwoFactorChallenge = async (rawToken: string): Promise<TwoFactorResendResult> => {
    if (!rawToken) return { ok: false, reason: 'NOT_FOUND' };

    const challenge = await prisma.twoFactorChallenge.findUnique({
        where: { tokenHash: hashTwoFactorToken(rawToken) },
        include: { user: { select: { email: true, isEnabled: true } } },
    });

    if (!challenge || challenge.consumedAt || !challenge.user.isEnabled) {
        return { ok: false, reason: 'NOT_FOUND' };
    }
    if (challenge.expiresAt <= new Date()) {
        return { ok: false, reason: 'EXPIRED' };
    }
    if (challenge.attempts >= challenge.maxAttempts) {
        return { ok: false, reason: 'LOCKED' };
    }
    if (challenge.resendCount >= MAX_RESENDS) {
        return { ok: false, reason: 'TOO_MANY_RESENDS' };
    }

    const cooldownEndsAt = dayjs(challenge.updatedAt).add(RESEND_COOLDOWN_SECONDS, 'second');
    if (dayjs().isBefore(cooldownEndsAt)) {
        return { ok: false, reason: 'COOLDOWN', retryAfterSeconds: cooldownEndsAt.diff(dayjs(), 'second') };
    }

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
    userId: number;
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

// Bound to a specific userId so a trusted-device cookie for one account can't be
// replayed to skip 2FA on a different account (e.g. two admins sharing a browser).
export const isTrustedDeviceValid = async (rawToken: string | undefined, userId: number): Promise<boolean> => {
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

