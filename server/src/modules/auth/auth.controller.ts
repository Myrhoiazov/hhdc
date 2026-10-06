
import { NextFunction, Request, Response } from 'express';
import { AuthSecurityEventType, Prisma } from '@prisma/client';
import prisma from '../../../prisma/prisma-client'
import { getUserByEmail } from '../users/users.service';
import { findToken, generateSessionToken, refreshToken, removeToken, replaceToken, saveToken } from './auth.token.service';
import ApiError from '../../common/errors/api-error';
import { loginType, twoFactorVerifyType } from './auth.schema';
import { hashPassword, verifyPassword } from './auth.password.service';
import { upgradeUserPasswordHash } from '../users/users.service';
import { createCsrfToken } from './auth.csrf.service';
import { recordAuthSecurityEvent } from './auth.security-audit.service';
import { notifyNewDeviceAfterFailures } from '../communication';
import {
    CODE_TTL_MINUTES,
    createTrustedDevice,
    createTwoFactorChallenge,
    isTrustedDeviceValid,
    resendTwoFactorChallenge,
    TRUSTED_DEVICE_DAYS,
    verifyTwoFactorChallenge,
} from './auth.two-factor.service';
import { logger } from '../../common/logger';
import { CAPTCHA_THRESHOLD, captchaSiteKey, isCaptchaConfigured } from './auth.captcha.service';

const cookieName = () => process.env.COOKIE_NAME || 'ddc_refresh';
/** True when MODE=production — controls secure-flag on cookies. Named constant so Skylos can prove it's boolean. */
const isProductionEnv = process.env.MODE === 'production';
const cookieOptions = {
    httpOnly: true,
    path: '/',
    secure: isProductionEnv,
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Matches middleware.LoginRateLimit.ts's WINDOW_MS conceptually (both look at
// "recent" login activity) but is kept as its own constant — one is a rate-limit
// window, the other a suspicious-activity lookback, and they're free to diverge.
const RECENT_FAILURE_LOOKBACK_MS = 15 * 60 * 1000;

const TWO_FACTOR_PENDING_COOKIE = 'ddc_2fa_pending';
// Exported for auth.telegram.controller.ts's login callback — it needs to check
// the same trusted-device cookie login() does, to preserve the exact 2FA/
// trusted-device policy for a Telegram-verified login (see docs/spec/DDC_CRM_TELEGRAM_AUTH_SPEC.md §8).
export const TRUSTED_DEVICE_COOKIE = 'ddc_trusted_device';

const twoFactorPendingCookieOptions = {
    httpOnly: true,
    path: '/',
    secure: isProductionEnv,
    sameSite: 'strict' as const,
    maxAge: CODE_TTL_MINUTES * 60 * 1000,
};

const trustedDeviceCookieOptions = {
    httpOnly: true,
    path: '/',
    secure: isProductionEnv,
    sameSite: 'strict' as const,
    maxAge: TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000,
};

// "d***@gmail.com" — enough for the user to recognize their own address without
// showing it in full on an unauthenticated screen.
export const maskEmail = (email: string) => {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    return `${local[0] ?? ''}***@${domain}`;
};

// Fields the SPA needs after successful auth — never select password, salt, or
// internal columns. This is the single source of truth; buildAuthenticatedUserData
// must be kept in sync (verified by auth.controller.test.ts).
export const authenticatedUserSelect = {
    id: true,
    firstName: true,
    lastName: true,
    role: true,
    email: true,
    isEnabled: true,
    isActive: true,
    lastLogin: true,
} satisfies Prisma.UserSelect;

// The user shape available after auth — excludes password, salt, and internal
// columns. Derived from authenticatedUserSelect so it stays in sync.
export type AuthenticatedUser = NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique<{ where: { id: number }; select: typeof authenticatedUserSelect }>>>>;

// Why login failed, surfaced as an audit reason. Distinct so security tooling
// can tell a disabled account from wrong credentials.
export const describeLoginFailure = (user: AuthenticatedUser | null) => ({
    targetUserId: user?.id,
    reason: user && !user.isEnabled ? 'ACCOUNT_DISABLED' : 'INVALID_CREDENTIALS',
} as const);

// The exact user profile the SPA receives on successful auth. Never leaks
// password hash, salt, or internal columns.
export const buildAuthenticatedUserData = (user: AuthenticatedUser, lastLogin: Date) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    email: user.email,
    isEnabled: user.isEnabled,
    isActive: user.isActive,
    lastLogin,
});

export const buildCaptchaPrewarmLoginError = (message: string, attemptCount: unknown) => {
    if (!isCaptchaConfigured()) return null;
    if (typeof attemptCount !== 'number' || attemptCount < CAPTCHA_THRESHOLD - 1) return null;

    return {
        code: 'CAPTCHA_REQUIRED',
        message,
        siteKey: captchaSiteKey(),
    };
};

// Shared by the trusted-device bypass and by 2fa/verify's success path — both
// end in exactly the same "you are now logged in" outcome as today's direct login.
// Also reused by auth.telegram.controller.ts's login callback so a Telegram-
// verified login issues the identical CRM session, not a parallel one.
export const issueSession = async (
    user: AuthenticatedUser,
    req: Request,
    res: Response,
    metadata?: Record<string, unknown>,
) => {
    const sessionToken = generateSessionToken();

    await saveToken(user.id, sessionToken, req.ip, req.headers['user-agent']);
    await recordAuthSecurityEvent({
        type: AuthSecurityEventType.SESSION_CREATED,
        actorUserId: user.id,
        targetUserId: user.id,
        req,
        metadata: { reason: 'LOGIN' },
    });

    await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
    });

    await recordAuthSecurityEvent({
        type: AuthSecurityEventType.LOGIN_SUCCEEDED,
        actorUserId: user.id,
        targetUserId: user.id,
        req,
        metadata,
    });

    const userData = buildAuthenticatedUserData(user, new Date());

    res.cookie(cookieName(), sessionToken, cookieOptions);

    return userData;
};

const authenticateUser = async (
    email: string,
    password: string,
    req: Request,
): Promise<{ user: AuthenticatedUser; passwordCheck: Awaited<ReturnType<typeof verifyPassword>> }> => {
    const user = await getUserByEmail(email);
    const passwordCheck = user
        ? await verifyPassword(user.password, user.salt, password)
        : await verifyPassword(
            '$argon2id$v=19$m=19456,t=2,p=1$vPHHlsWpDNP/baAJNAfHYw$NPtVAuSXsZ1Yyv8+3ZqVH2pLxb41tRaWkSQ8n388gXo',
            null,
            password,
        );

    if (!user || !passwordCheck.valid || !user.isEnabled) {
        await recordAuthSecurityEvent({
            type: AuthSecurityEventType.LOGIN_FAILED,
            ...describeLoginFailure(user),
            req,
            metadata: {
                email,
                reason: describeLoginFailure(user).reason,
            },
        });
        throw new ApiError(401, 'Неверный email или пароль');
    }

    return { user, passwordCheck };
};

const startAuthenticatedSession = async (
    user: AuthenticatedUser,
    req: Request,
    res: Response,
    options: { passwordHashUpgraded: boolean; twoFactor: 'SKIPPED_TRUSTED_DEVICE' | 'SKIPPED_DEV_MODE' },
) => {
    const userData = await issueSession(user, req, res, options);
    return res.status(200).json(userData);
};

// Response-agnostic core: creates the challenge, sets the pending cookie, and
// audits it — everything requestTwoFactor's JSON-XHR callers and a Telegram-
// login redirect callback both need. Exported so auth.telegram.controller.ts's
// login callback requests the exact same email 2FA challenge password login
// does — Telegram identity verification replaces password entry only, it never
// substitutes for 2FA — without also inheriting requestTwoFactor's JSON
// response (a redirect flow can't send one, it needs to itself redirect after).
export const createPendingTwoFactorChallenge = async (user: AuthenticatedUser, req: Request, res: Response) => {
    let challenge;
    try {
        challenge = await createTwoFactorChallenge({
            userId: user.id,
            email: user.email,
            ipAddress: req.ip,
            userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
        });
    } catch (sendError) {
        logger.error(`Failed to send 2FA code to user ${user.id}: ${sendError}`);
        throw new ApiError(503, 'Не удалось отправить код подтверждения. Попробуйте позже.');
    }

    res.cookie(TWO_FACTOR_PENDING_COOKIE, challenge.rawToken, twoFactorPendingCookieOptions);

    await recordAuthSecurityEvent({
        type: AuthSecurityEventType.TWO_FACTOR_REQUIRED,
        actorUserId: user.id,
        targetUserId: user.id,
        req,
        metadata: { channel: 'EMAIL' },
    });

    return { maskedEmail: maskEmail(user.email) };
};

const requestTwoFactor = async (user: AuthenticatedUser, req: Request, res: Response) => {
    const { maskedEmail } = await createPendingTwoFactorChallenge(user, req, res);
    return res.status(200).json({
        requiresTwoFactor: true,
        maskedEmail,
    });
};

export const login = async (req: Request<{}, {}, loginType>, res: Response, next: NextFunction) => {
    const email = req.body.email.trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
        throw ApiError.BadRequest('All fields are required');
    }

    try {
        const { user, passwordCheck } = await authenticateUser(email, password, req);

        if (passwordCheck.needsUpgrade) {
            await upgradeUserPasswordHash(user.id, await hashPassword(password));
        }

        const trustedDeviceToken = req.cookies[TRUSTED_DEVICE_COOKIE];
        const hasTrustedDevice = await isTrustedDeviceValid(trustedDeviceToken, user.id);
        // Local dev DBs have no EmailAccount configured to actually send 2FA codes — skip
        // rather than block every local login. Never true in production (MODE=production there).
        const isLocalDev = process.env.MODE === 'development';

        if (hasTrustedDevice || isLocalDev) {
            return startAuthenticatedSession(user, req, res, {
                passwordHashUpgraded: passwordCheck.needsUpgrade,
                twoFactor: hasTrustedDevice ? 'SKIPPED_TRUSTED_DEVICE' : 'SKIPPED_DEV_MODE',
            });
        }

        return requestTwoFactor(user, req, res);
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
            const captchaPrewarm = buildCaptchaPrewarmLoginError(error.message, res.locals.loginRateLimitCount);
            if (captchaPrewarm) {
                return res.status(error.status).json(captchaPrewarm);
            }
        }
        console.error('Login error:', error);
        next(error)
    }
}

const TWO_FACTOR_FAILURE_STATUS: Record<string, number> = {
    NOT_FOUND: 401,
    EXPIRED: 401,
    LOCKED: 423,
    INVALID_CODE: 401,
};

const TWO_FACTOR_FAILURE_MESSAGE: Record<string, string> = {
    NOT_FOUND: 'Код истёк или недействителен. Войдите заново.',
    EXPIRED: 'Код истёк. Войдите заново.',
    LOCKED: 'Слишком много неверных попыток. Войдите заново.',
    INVALID_CODE: 'Неверный код подтверждения',
};

// A challenge that's no longer usable for any reason (not found, expired,
// locked) also means the pending cookie is dead weight — clear it so the client
// doesn't keep retrying against a cookie that can never succeed.
const isTerminalTwoFactorReason = (reason: string) => reason !== 'INVALID_CODE';

const createTrustedDeviceIfRequested = async (req: Request, res: Response, userId: number) => {
    if (!req.body.trustDevice) return;
    const device = await createTrustedDevice({
        userId,
        ipAddress: req.ip,
        userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
    });
    res.cookie(TRUSTED_DEVICE_COOKIE, device.rawToken, trustedDeviceCookieOptions);
    await recordAuthSecurityEvent({
        type: AuthSecurityEventType.TRUSTED_DEVICE_CREATED,
        actorUserId: userId,
        targetUserId: userId,
        req,
    });
};

// Records the failure, clears the pending cookie for terminal reasons (see
// isTerminalTwoFactorReason), then throws the matching ApiError — never returns normally.
const rejectTwoFactorFailure = async (reason: string, req: Request, res: Response): Promise<never> => {
    await recordAuthSecurityEvent({
        type: reason === 'LOCKED' ? AuthSecurityEventType.TWO_FACTOR_LOCKED : AuthSecurityEventType.TWO_FACTOR_FAILED,
        req,
        metadata: { reason },
    });

    if (isTerminalTwoFactorReason(reason)) {
        res.clearCookie(TWO_FACTOR_PENDING_COOKIE, twoFactorPendingCookieOptions);
    }

    throw new ApiError(TWO_FACTOR_FAILURE_STATUS[reason], TWO_FACTOR_FAILURE_MESSAGE[reason]);
};

// Reaching 2FA at all already means no trusted-device cookie was present (see login()) — so
// this success is by definition "a new/untrusted device". Only alert when it follows recent
// failed attempts, to avoid paging on every ordinary first-time-device login.
//
// This is a DB query, not state threaded from login()'s rate-limit hit: login() and this verify
// step are two separate HTTP requests (the user re-enters the app between them to type the 2FA
// code), so nothing set on the login() request object survives to here. The query is indexed
// (@@index([targetUserId, createdAt]) on AuthSecurityEvent) and only runs on the already-low-
// frequency 2FA-success path, not per keystroke.
const notifyNewDeviceIfRecentFailures = async (user: { id: number; email: string }, req: Request): Promise<void> => {
    const recentFailures = await prisma.authSecurityEvent.count({
        where: {
            type: AuthSecurityEventType.LOGIN_FAILED,
            targetUserId: user.id,
            createdAt: { gte: new Date(Date.now() - RECENT_FAILURE_LOOKBACK_MS) },
        },
    });
    if (recentFailures > 0) {
        void notifyNewDeviceAfterFailures({ email: user.email, ip: req.ip, recentFailures })
            .catch((error) => console.error('Failed to send new-device Telegram notification:', error));
    }
};

export const verifyTwoFactor = async (req: Request<{}, {}, twoFactorVerifyType>, res: Response, next: NextFunction) => {
    const pendingToken = req.cookies[TWO_FACTOR_PENDING_COOKIE];
    const { code, trustDevice } = req.body;

    try {
        const result = await verifyTwoFactorChallenge(pendingToken, code);
        if ('reason' in result) return await rejectTwoFactorFailure(result.reason, req, res);

        const user = await prisma.user.findUnique({ where: { id: result.userId }, select: authenticatedUserSelect });
        if (!user || !user.isEnabled) {
            res.clearCookie(TWO_FACTOR_PENDING_COOKIE, twoFactorPendingCookieOptions);
            throw ApiError.UnauthorizedError();
        }

        await recordAuthSecurityEvent({
            type: AuthSecurityEventType.TWO_FACTOR_SUCCEEDED,
            actorUserId: user.id,
            targetUserId: user.id,
            req,
        });

        await notifyNewDeviceIfRecentFailures(user, req);

        const userData = await issueSession(user, req, res, { twoFactor: 'VERIFIED' });
        res.clearCookie(TWO_FACTOR_PENDING_COOKIE, twoFactorPendingCookieOptions);

        await createTrustedDeviceIfRequested(req, res, user.id);

        return res.status(200).json(userData);
    } catch (error) {
        next(error);
    }
};

export const resendTwoFactor = async (req: Request, res: Response, next: NextFunction) => {
    const pendingToken = req.cookies[TWO_FACTOR_PENDING_COOKIE];

    try {
        let result;
        try {
            result = await resendTwoFactorChallenge(pendingToken);
        } catch (sendError) {
            logger.error(`Failed to resend 2FA code: ${sendError}`);
            throw new ApiError(503, 'Не удалось отправить код подтверждения. Попробуйте позже.');
        }

        if ('reason' in result) {
            await recordAuthSecurityEvent({
                type: AuthSecurityEventType.TWO_FACTOR_FAILED,
                req,
                metadata: { reason: result.reason, action: 'RESEND' },
            });

            if (result.reason === 'COOLDOWN' && result.retryAfterSeconds) {
                res.setHeader('Retry-After', result.retryAfterSeconds);
                throw new ApiError(429, `Подождите ${result.retryAfterSeconds} с перед повторной отправкой`);
            }
            if (result.reason === 'TOO_MANY_RESENDS') {
                throw new ApiError(429, 'Превышен лимит повторных отправок. Войдите заново.');
            }

            res.clearCookie(TWO_FACTOR_PENDING_COOKIE, twoFactorPendingCookieOptions);
            throw new ApiError(401, 'Код истёк или недействителен. Войдите заново.');
        }

        await recordAuthSecurityEvent({
            type: AuthSecurityEventType.TWO_FACTOR_RESENT,
            req,
        });

        return res.status(200).json({ message: 'Код отправлен повторно' });
    } catch (error) {
        next(error);
    }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
    const sessionToken = req.cookies[cookieName()];

    try {
        const session = await findToken(sessionToken);
        await removeToken(sessionToken);
        if (session?.userId) {
            await recordAuthSecurityEvent({
                type: AuthSecurityEventType.SESSION_REVOKED,
                actorUserId: session.userId,
                targetUserId: session.userId,
                req,
                metadata: { reason: 'LOGOUT' },
            });
            await recordAuthSecurityEvent({
                type: AuthSecurityEventType.LOGOUT,
                actorUserId: session.userId,
                targetUserId: session.userId,
                req,
            });
        }
        res.clearCookie(cookieName(), cookieOptions);
        return res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        next(error)
    }
}

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies[cookieName()];

        const { newSessionToken, user } = await refreshToken(token);
        await replaceToken(token, user.id, newSessionToken, req.ip, req.headers['user-agent']);
        await recordAuthSecurityEvent({
            type: AuthSecurityEventType.SESSION_ROTATED,
            actorUserId: user.id,
            targetUserId: user.id,
            req,
            metadata: { reason: 'REFRESH' },
        });

        res.cookie(cookieName(), newSessionToken, cookieOptions);

        const userData = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            email: user.email,
            isEnabled: user.isEnabled,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
        }

        return res.json(userData);
    } catch (error) {
        next(error)
    }
}

export const csrf = async (req: Request, res: Response) => {
    const sessionToken = req.cookies[cookieName()];
    if (!sessionToken) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    return res.status(200).json({ csrfToken: createCsrfToken(sessionToken) });
}
