import type { Request, RequestHandler, Response } from 'express';
import { ApiError } from '../../common/http';
import { logger } from '../../common/logger';
import { COOKIE_NAME, recordSecurityEvent } from './auth.middleware';
import {
    authenticateUser, AuthenticatedUser, createSession, csrfForSession, loadUser, loginSchema, publicUser, sessionSecret, twoFactorVerifySchema,
} from './auth.service';
import {
    CODE_TTL_MINUTES,
    createTrustedDevice,
    createTwoFactorChallenge,
    isTrustedDeviceValid,
    resendTwoFactorChallenge,
    TRUSTED_DEVICE_DAYS,
    TwoFactorVerifyFailureReason,
    verifyTwoFactorChallenge,
} from './auth.two-factor.service';
import { CAPTCHA_THRESHOLD, captchaSiteKey, isCaptchaConfigured } from './auth.captcha.service';
import { hitRateLimit } from './auth.rate-limit.service';

const TWO_FACTOR_PENDING_COOKIE = 'hhdc_2fa_pending';
export const TRUSTED_DEVICE_COOKIE = 'hhdc_trusted_device';

const baseCookieOptions = () => ({ httpOnly: true, path: '/api/v1', secure: process.env.NODE_ENV === 'production' });
const twoFactorPendingCookieOptions = () => ({ ...baseCookieOptions(), sameSite: 'strict' as const });
const trustedDeviceCookieOptions = () => ({ ...baseCookieOptions(), sameSite: 'strict' as const });

const userAgentOf = (req: Request) => (typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null);

// "d***@gmail.com" — enough for the user to recognize their own address without showing it
// in full on an unauthenticated screen.
export const maskEmail = (email: string) => {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    return `${local[0] ?? ''}***@${domain}`;
};

// Shows the captcha one failed attempt early, so the widget is already solved by the time
// the rate limiter starts demanding a token.
export const buildCaptchaPrewarmLoginError = (message: string, attemptCount: unknown) => {
    if (!isCaptchaConfigured()) return null;
    if (typeof attemptCount !== 'number' || attemptCount < CAPTCHA_THRESHOLD - 1) return null;

    return {
        code: 'CAPTCHA_REQUIRED',
        message,
        siteKey: captchaSiteKey(),
    };
};

// Shared by the trusted-device bypass and by 2fa/verify's success path — both end in exactly
// the same "you are now logged in" outcome.
const issueSession = async (user: AuthenticatedUser, req: Request, metadata: Record<string, string>) => {
    const { token, expiresAt } = await createSession(user.id);
    req.res!.cookie(COOKIE_NAME, token, { ...baseCookieOptions(), sameSite: 'lax', expires: expiresAt });
    recordSecurityEvent(req, 'LOGIN_SUCCEEDED', { ...metadata, targetUserId: user.id });
    return { user: publicUser(user), csrfToken: csrfForSession(token, sessionSecret()) };
};

const CHALLENGE_WINDOW_MS = 15 * 60 * 1000;
const MAX_CHALLENGES_PER_WINDOW = 5;

// Each challenge allows a handful of guesses, so the number of challenges one account can get
// is capped too — whatever address the requests come from. It also caps the code letters.
const assertChallengeAllowed = async (userId: string, res: Response) => {
    const issued = await hitRateLimit({ key: `rate-limit:2fa-issue:${userId}`, windowMs: CHALLENGE_WINDOW_MS, maxAttempts: MAX_CHALLENGES_PER_WINDOW });
    if (!issued.limited) return;
    res.setHeader('Retry-After', issued.retryAfterSeconds);
    throw new ApiError(429, 'TWO_FACTOR_RATE_LIMIT', 'Too many confirmation codes requested. Try again later.');
};

const requestTwoFactor = async (user: AuthenticatedUser, req: Request) => {
    await assertChallengeAllowed(user.id, req.res!);
    let challenge;
    try {
        challenge = await createTwoFactorChallenge({ userId: user.id, email: user.email, ipAddress: req.ip, userAgent: userAgentOf(req) });
    } catch (sendError) {
        logger.error(`Failed to send 2FA code to user ${user.id}: ${sendError}`);
        throw new ApiError(503, 'TWO_FACTOR_SEND_FAILED', 'Could not send the confirmation code. Try again later.');
    }

    req.res!.cookie(TWO_FACTOR_PENDING_COOKIE, challenge.rawToken, { ...twoFactorPendingCookieOptions(), maxAge: CODE_TTL_MINUTES * 60 * 1000 });
    recordSecurityEvent(req, 'TWO_FACTOR_REQUIRED', { channel: 'EMAIL', targetUserId: user.id });

    return { requiresTwoFactor: true, maskedEmail: maskEmail(user.email) };
};

const startLogin = async (req: Request) => {
    const input = loginSchema.parse(req.body);
    let user: AuthenticatedUser;
    try {
        user = await authenticateUser(input.email, input.password);
    } catch (error) {
        recordSecurityEvent(req, 'LOGIN_FAILED', { email: input.email });
        throw error;
    }

    const hasTrustedDevice = await isTrustedDeviceValid(req.cookies[TRUSTED_DEVICE_COOKIE], user.id);
    // Local dev databases have no mailbox configured to actually send 2FA codes — skip rather
    // than block every local login. Never true in production (MODE=production there).
    const isLocalDev = process.env.MODE === 'development';

    if (hasTrustedDevice || isLocalDev) {
        return issueSession(user, req, { twoFactor: hasTrustedDevice ? 'SKIPPED_TRUSTED_DEVICE' : 'SKIPPED_DEV_MODE' });
    }
    return requestTwoFactor(user, req);
};

export const login: RequestHandler = async (req, res, next) => {
    try {
        res.json({ data: await startLogin(req) });
    } catch (error) {
        const captchaPrewarm = error instanceof ApiError && error.status === 401
            ? buildCaptchaPrewarmLoginError(error.message, res.locals.loginRateLimitCount)
            : null;
        if (captchaPrewarm) {
            res.status(401).json({ error: { ...captchaPrewarm, requestId: res.locals.requestId } });
            return;
        }
        next(error);
    }
};

const TWO_FACTOR_FAILURE_STATUS: Record<TwoFactorVerifyFailureReason, number> = {
    NOT_FOUND: 401,
    EXPIRED: 401,
    LOCKED: 423,
    INVALID_CODE: 401,
};

const TWO_FACTOR_FAILURE_MESSAGE: Record<TwoFactorVerifyFailureReason, string> = {
    NOT_FOUND: 'The code has expired or is invalid. Sign in again.',
    EXPIRED: 'The code has expired. Sign in again.',
    LOCKED: 'Too many wrong attempts. Sign in again.',
    INVALID_CODE: 'Wrong confirmation code',
};

// A challenge that's no longer usable for any reason (not found, expired, locked) also means
// the pending cookie is dead weight — clear it so the client doesn't keep retrying against a
// cookie that can never succeed.
const isTerminalTwoFactorReason = (reason: string) => reason !== 'INVALID_CODE';

const createTrustedDeviceIfRequested = async (req: Request, res: Response, options: { userId: string; trustDevice?: boolean }) => {
    if (!options.trustDevice) return;
    const device = await createTrustedDevice({ userId: options.userId, ipAddress: req.ip, userAgent: userAgentOf(req) });
    res.cookie(TRUSTED_DEVICE_COOKIE, device.rawToken, { ...trustedDeviceCookieOptions(), maxAge: TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000 });
    recordSecurityEvent(req, 'TRUSTED_DEVICE_CREATED', { targetUserId: options.userId });
};

// Records the failure, clears the pending cookie for terminal reasons (see
// isTerminalTwoFactorReason), then throws the matching ApiError — never returns normally.
const rejectTwoFactorFailure = (reason: TwoFactorVerifyFailureReason, req: Request, res: Response): never => {
    recordSecurityEvent(req, reason === 'LOCKED' ? 'TWO_FACTOR_LOCKED' : 'TWO_FACTOR_FAILED', { reason });

    if (isTerminalTwoFactorReason(reason)) {
        res.clearCookie(TWO_FACTOR_PENDING_COOKIE, twoFactorPendingCookieOptions());
    }

    throw new ApiError(TWO_FACTOR_FAILURE_STATUS[reason], `TWO_FACTOR_${reason}`, TWO_FACTOR_FAILURE_MESSAGE[reason]);
};

export const verifyTwoFactor = async (req: Request) => {
    const res = req.res!;
    const { code, trustDevice } = twoFactorVerifySchema.parse(req.body);

    const result = await verifyTwoFactorChallenge(req.cookies[TWO_FACTOR_PENDING_COOKIE], code);
    if ('reason' in result) return rejectTwoFactorFailure(result.reason, req, res);

    const user = await loadUser(result.userId);
    if (!user?.isActive) {
        res.clearCookie(TWO_FACTOR_PENDING_COOKIE, twoFactorPendingCookieOptions());
        throw new ApiError(401, 'UNAUTHENTICATED', 'Login required');
    }

    recordSecurityEvent(req, 'TWO_FACTOR_SUCCEEDED', { targetUserId: user.id });

    const data = await issueSession(user, req, { twoFactor: 'VERIFIED' });
    res.clearCookie(TWO_FACTOR_PENDING_COOKIE, twoFactorPendingCookieOptions());

    await createTrustedDeviceIfRequested(req, res, { userId: user.id, trustDevice });

    return data;
};

const resendOrFail = async (pendingToken: string) => {
    try {
        return await resendTwoFactorChallenge(pendingToken);
    } catch (sendError) {
        logger.error(`Failed to resend 2FA code: ${sendError}`);
        throw new ApiError(503, 'TWO_FACTOR_SEND_FAILED', 'Could not send the confirmation code. Try again later.');
    }
};

export const resendTwoFactor = async (req: Request) => {
    const res = req.res!;
    const result = await resendOrFail(req.cookies[TWO_FACTOR_PENDING_COOKIE]);

    if (!('reason' in result)) {
        recordSecurityEvent(req, 'TWO_FACTOR_RESENT');
        return { resent: true };
    }

    recordSecurityEvent(req, 'TWO_FACTOR_FAILED', { reason: result.reason, action: 'RESEND' });

    if (result.reason === 'COOLDOWN' && result.retryAfterSeconds) {
        res.setHeader('Retry-After', result.retryAfterSeconds);
        throw new ApiError(429, 'TWO_FACTOR_RESEND_COOLDOWN', `Wait ${result.retryAfterSeconds} s before sending the code again`);
    }
    if (result.reason === 'TOO_MANY_RESENDS') {
        throw new ApiError(429, 'TWO_FACTOR_TOO_MANY_RESENDS', 'The resend limit is reached. Sign in again.');
    }

    res.clearCookie(TWO_FACTOR_PENDING_COOKIE, twoFactorPendingCookieOptions());
    throw new ApiError(401, 'TWO_FACTOR_NOT_FOUND', 'The code has expired or is invalid. Sign in again.');
};
