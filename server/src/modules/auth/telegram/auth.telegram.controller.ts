import { NextFunction, Request, Response } from 'express';
import { AuthSecurityEventType, TelegramAuthFlow, UserRole } from '@prisma/client';
import prisma from '../../../../prisma/prisma-client';
import ApiError from '../../../common/errors/api-error';
import { recordAuthSecurityEvent } from '../auth.security-audit.service';
import { isTrustedDeviceValid } from '../auth.two-factor.service';
import {
    AuthenticatedUser,
    authenticatedUserSelect,
    createPendingTwoFactorChallenge,
    issueSession,
    TRUSTED_DEVICE_COOKIE,
} from '../auth.controller';
import {
    buildAuthorizationUrl,
    completeAuthorizationCodeExchange,
    isTelegramOidcConfigured,
} from './auth.telegram.oidc-client';
import {
    ConsumeTelegramTransactionResult,
    consumeTelegramAuthTransaction,
    createTelegramAuthTransaction,
    TelegramTransactionFailureReason,
    verifyTelegramNonce,
} from './auth.telegram.transaction.service';
import {
    findTelegramIdentityByProviderUserId,
    findTelegramIdentityByUserId,
    linkTelegramIdentity,
    touchTelegramIdentityLastLogin,
    unlinkTelegramIdentity,
} from './auth.telegram.identity.service';

const isProductionEnv = process.env.MODE === 'production';
const TELEGRAM_OAUTH_STATE_COOKIE = 'ddc_telegram_oauth_state';

// Scoped to the callback path only — the cookie's one job is to survive the
// cross-site top-level redirect back from oauth.telegram.org, exactly like
// service.Payments.Auth.ts's mollie_oauth_state cookie (sameSite: 'strict' would
// be dropped on that redirect, sameSite: 'lax' is not).
const telegramOAuthStateCookieOptions = {
    httpOnly: true,
    path: '/api/v1/auth/telegram/callback',
    secure: isProductionEnv,
    sameSite: 'lax' as const,
    maxAge: 5 * 60 * 1000,
};

// No trailing slash, and '' (not '/') when unset — so `${clientUrl()}${path}`
// below always joins into a clean absolute path, falling back to a same-origin
// relative redirect rather than throwing if CLIENT_URL is ever unset.
const clientUrl = () => {
    const fallback = process.env.MODE === 'development' ? 'http://localhost:3000' : undefined;
    const base = process.env.CLIENT_URL ?? fallback;
    return base ? base.replace(/\/$/, '') : '';
};

const redirectWithStatus = (res: Response, path: string, params: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    res.redirect(`${clientUrl()}${path}?${query}`);
};

// The Profile page route requires an :id (RoutePath.profile = '/profile/',
// routed as '/profile/:id') — a bare '/profile' 404s, so every LINK-flow
// redirect must carry the userId. LOGIN-flow redirects never need one — the
// login page itself needs no id.
const profilePath = (userId: number) => `/profile/${userId}`;

const redirectWithError = (res: Response, flow: 'login' | { link: number }, code: string) => {
    const path = flow === 'login' ? '/login' : profilePath(flow.link);
    redirectWithStatus(res, path, { telegramError: code });
};

// Pure predicate, exported for direct unit testing (see auth.telegram.controller.test.ts)
// — the product decision is Telegram auth is ADMIN-only, full stop.
export const isTelegramRoleAllowed = (role: UserRole) => role === UserRole.ADMIN;

// Pure mapping, exported for direct unit testing.
export const mapTransactionFailureToErrorCode = (reason: TelegramTransactionFailureReason) => (
    reason === 'EXPIRED' ? 'OIDC_TRANSACTION_EXPIRED' : 'OIDC_STATE_INVALID'
);

export type TelegramLoginDenialReason = 'ACCOUNT_DISABLED' | 'ROLE_NOT_ALLOWED';

// Pure eligibility check for a Telegram login once the CRM user behind the
// linked identity is resolved — exported for direct unit testing. Mirrors
// describeLoginFailure in auth.controller.ts (password login's equivalent).
// A missing user (identity points at a deleted account) is handled by the
// caller, not here — this only classifies a user row that does exist.
export const resolveTelegramLoginDenialReason = (
    user: { isEnabled: boolean; role: UserRole },
): TelegramLoginDenialReason | null => {
    if (!user.isEnabled) return 'ACCOUNT_DISABLED';
    if (!isTelegramRoleAllowed(user.role)) return 'ROLE_NOT_ALLOWED';
    return null;
};

// Role gate is enforced here (not only via requireRole on the route) so every
// denial — link attempt, unlink attempt, or a login by an identity whose owner
// is no longer ADMIN — is audited, per the explicit product decision that
// Telegram auth is ADMIN-only and denials must be observable, not just silent 403s.
export const denyIfNotAdmin = async (req: Request, user: { id: number; role: UserRole }, eventType: AuthSecurityEventType) => {
    if (isTelegramRoleAllowed(user.role)) return false;

    await recordAuthSecurityEvent({
        type: eventType,
        actorUserId: user.id,
        targetUserId: user.id,
        req,
        metadata: { reason: 'ROLE_NOT_ALLOWED' },
    });
    return true;
};

const requireOidcConfigured = () => {
    if (!isTelegramOidcConfigured()) {
        throw new ApiError(503, 'Вход через Telegram временно недоступен');
    }
};

// GET, not POST — this is a full top-level browser navigation to Telegram, the
// same shape as controller.Payments's connectMollieController, not an XHR the
// SPA reads a JSON body from.
export const startTelegramLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        requireOidcConfigured();

        const { state, nonce, codeChallenge } = await createTelegramAuthTransaction({ flow: TelegramAuthFlow.LOGIN });
        res.cookie(TELEGRAM_OAUTH_STATE_COOKIE, state, telegramOAuthStateCookieOptions);

        return res.redirect(buildAuthorizationUrl({ state, nonce, codeChallenge }));
    } catch (error) {
        next(error);
    }
};

export const startTelegramLink = async (req: Request, res: Response, next: NextFunction) => {
    try {
        requireOidcConfigured();

        const user = req.user;
        if (!user) {
            throw ApiError.UnauthorizedError();
        }
        if (await denyIfNotAdmin(req, user, AuthSecurityEventType.TELEGRAM_LINKED)) {
            throw new ApiError(403, 'Недоступно для вашей роли');
        }

        const { state, nonce, codeChallenge } = await createTelegramAuthTransaction({
            flow: TelegramAuthFlow.LINK,
            userId: user.id,
        });
        res.cookie(TELEGRAM_OAUTH_STATE_COOKIE, state, telegramOAuthStateCookieOptions);

        return res.redirect(buildAuthorizationUrl({ state, nonce, codeChallenge }));
    } catch (error) {
        next(error);
    }
};

// Single shared endpoint for both LOGIN and LINK — the flow is read from the
// server-side transaction row, never trusted from the URL or any request
// parameter (spec section 7: "The callback must distinguish LOGIN and LINK
// using trusted server-side transaction state, not arbitrary query parameters").
type TelegramTransaction = Extract<ConsumeTelegramTransactionResult, { ok: true }>;

// transaction.userId is always set for a LINK transaction (bound at creation in
// startTelegramLink) — errorTarget falls back to '/login' in the defensive case that
// invariant ever breaks, since a profile link can't be built without an id.
const resolveTelegramCallbackFlow = (transaction: TelegramTransaction): { flow: 'login' | 'link'; errorTarget: 'login' | { link: number } } => {
    const flow: 'login' | 'link' = transaction.flow === TelegramAuthFlow.LINK ? 'link' : 'login';
    const errorTarget: 'login' | { link: number } = flow === 'link' && transaction.userId !== null
        ? { link: transaction.userId }
        : 'login';
    return { flow, errorTarget };
};

// Returns null (having already redirected the response) when the code is missing, the exchange
// fails, or the nonce doesn't match — callers just need to check for null and return.
const exchangeAndVerifyTelegramCode = async (
    code: unknown,
    transaction: TelegramTransaction,
    errorTarget: 'login' | { link: number },
    res: Response,
) => {
    if (typeof code !== 'string') {
        redirectWithError(res, errorTarget, 'OIDC_TOKEN_INVALID');
        return null;
    }

    let exchange;
    try {
        exchange = await completeAuthorizationCodeExchange(code, transaction.codeVerifier);
    } catch (exchangeError) {
        console.error('Telegram OIDC code exchange/verification failed:', exchangeError);
        redirectWithError(res, errorTarget, 'OIDC_TOKEN_INVALID');
        return null;
    }

    if (!verifyTelegramNonce(exchange.nonce, transaction.nonceHash)) {
        redirectWithError(res, errorTarget, 'OIDC_NONCE_INVALID');
        return null;
    }

    return exchange.identity;
};

export const handleTelegramCallback = async (req: Request, res: Response) => {
    // Flow (LOGIN vs LINK) only becomes known once the transaction row is read
    // below — until then there's no trustworthy way to tell which page issued
    // this request, so early failures land on /login, the more common entry
    // point. This only affects which page shows the error, not any security
    // decision (those all key off the server-side transaction, never this).
    const EARLY_FAILURE_FLOW = 'login';
    const cookieState = req.cookies?.[TELEGRAM_OAUTH_STATE_COOKIE];
    res.clearCookie(TELEGRAM_OAUTH_STATE_COOKIE, { path: telegramOAuthStateCookieOptions.path });

    const { code, state, error: providerError } = req.query;

    if (typeof providerError === 'string') {
        return redirectWithError(res, EARLY_FAILURE_FLOW, 'OIDC_CANCELLED');
    }
    if (typeof state !== 'string' || !cookieState || cookieState !== state) {
        return redirectWithError(res, EARLY_FAILURE_FLOW, 'OIDC_STATE_INVALID');
    }

    const transaction = await consumeTelegramAuthTransaction(state);
    // 'reason' in transaction (not !transaction.ok) — this project's tsconfig
    // doesn't enable strictNullChecks, under which boolean-discriminant
    // narrowing on `ok` doesn't hold; checking for the failure-only field is
    // the pattern auth.controller.ts's verifyTwoFactor already relies on for
    // the identical TwoFactorVerifyResult shape.
    if ('reason' in transaction) {
        return redirectWithError(res, EARLY_FAILURE_FLOW, mapTransactionFailureToErrorCode(transaction.reason));
    }

    const { flow, errorTarget } = resolveTelegramCallbackFlow(transaction);

    const identity = await exchangeAndVerifyTelegramCode(code, transaction, errorTarget, res);
    if (!identity) return;

    if (flow === 'link') {
        if (transaction.userId === null) {
            return redirectWithError(res, 'login', 'OIDC_TOKEN_INVALID');
        }
        return handleTelegramLinkCallback(req, res, transaction.userId, identity);
    }
    return handleTelegramLoginCallback(req, res, identity);
};

const handleTelegramLinkCallback = async (
    req: Request,
    res: Response,
    userId: number,
    identity: { providerUserId: string; username: string | null; displayName: string | null },
) => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!user || await denyIfNotAdmin(req, user, AuthSecurityEventType.TELEGRAM_LINKED)) {
        return redirectWithError(res, { link: userId }, 'USER_NOT_AUTHORIZED');
    }

    const result = await linkTelegramIdentity({ userId, ...identity });
    if ('reason' in result) {
        // Both USER_ALREADY_LINKED (this CRM user already has a Telegram
        // identity) and IDENTITY_ALREADY_LINKED (this Telegram identity is
        // already someone else's) surface as the same conceptual
        // TELEGRAM_ALREADY_LINKED to the client — the distinction is kept in
        // the audit metadata below, not exposed to avoid account enumeration.
        await recordAuthSecurityEvent({
            type: AuthSecurityEventType.TELEGRAM_LINKED,
            actorUserId: userId,
            targetUserId: userId,
            req,
            metadata: { outcome: 'FAILED', reason: result.reason },
        });
        return redirectWithError(res, { link: userId }, 'TELEGRAM_ALREADY_LINKED');
    }

    await recordAuthSecurityEvent({
        type: AuthSecurityEventType.TELEGRAM_LINKED,
        actorUserId: userId,
        targetUserId: userId,
        req,
        metadata: { outcome: 'SUCCEEDED', telegramUsername: identity.username },
    });

    return redirectWithStatus(res, profilePath(userId), { telegramStatus: 'linked' });
};

const denyTelegramLogin = async (
    req: Request,
    res: Response,
    errorCode: string,
    metadata: { reason: string; actorUserId?: number; targetUserId?: number },
) => {
    await recordAuthSecurityEvent({
        type: AuthSecurityEventType.LOGIN_TELEGRAM_FAILED,
        actorUserId: metadata.actorUserId,
        targetUserId: metadata.targetUserId,
        req,
        metadata: { reason: metadata.reason },
    });
    return redirectWithError(res, 'login', errorCode);
};

// From here on this is exactly login()'s post-password-check branch in auth.controller.ts —
// Telegram identity verification replaces password entry only; 2FA/trusted-device/session
// issuance are all unchanged.
//
// Known limitation: ddc_trusted_device is sameSite:'strict' (auth.controller.ts), and this
// request is itself a cross-site-initiated redirect back from oauth.telegram.org — so the
// browser never attaches it here, even for a genuinely trusted device. Telegram login therefore
// always falls through to the 2FA branch below (never the trusted-device bypass). This fails
// safe (more 2FA, never less) and isn't fixed by loosening that cookie's sameSite, which would
// weaken the existing password-login trusted-device mechanism repo-wide — out of scope here.
// Documented as a known limitation, not silently accepted.
const completeTelegramLoginSession = async (user: AuthenticatedUser, req: Request, res: Response) => {
    const trustedDeviceToken = req.cookies?.[TRUSTED_DEVICE_COOKIE];
    const hasTrustedDevice = await isTrustedDeviceValid(trustedDeviceToken, user.id);
    const isLocalDev = process.env.MODE === 'development';

    if (hasTrustedDevice || isLocalDev) {
        await issueSession(user, req, res, {
            reason: 'TELEGRAM_LOGIN',
            twoFactor: hasTrustedDevice ? 'SKIPPED_TRUSTED_DEVICE' : 'SKIPPED_DEV_MODE',
        });
        return redirectWithStatus(res, '/', { telegramStatus: 'success' });
    }

    const { maskedEmail } = await createPendingTwoFactorChallenge(user, req, res);
    return redirectWithStatus(res, '/login', {
        telegramStatus: 'two_factor',
        maskedEmail,
    });
};

const handleTelegramLoginCallback = async (
    req: Request,
    res: Response,
    identity: { providerUserId: string; username: string | null; displayName: string | null },
) => {
    const authIdentity = await findTelegramIdentityByProviderUserId(identity.providerUserId);
    if (!authIdentity) return denyTelegramLogin(req, res, 'TELEGRAM_NOT_LINKED', { reason: 'TELEGRAM_NOT_LINKED' });

    const user = await prisma.user.findUnique({
        where: { id: authIdentity.userId },
        select: authenticatedUserSelect,
    }) as AuthenticatedUser | null;

    if (!user) {
        return denyTelegramLogin(req, res, 'USER_NOT_AUTHORIZED', {
            reason: 'ACCOUNT_MISSING',
            actorUserId: authIdentity.userId,
            targetUserId: authIdentity.userId,
        });
    }

    const denialReason = resolveTelegramLoginDenialReason(user);
    if (denialReason) {
        return denyTelegramLogin(req, res, 'USER_NOT_AUTHORIZED', {
            reason: denialReason,
            actorUserId: user.id,
            targetUserId: user.id,
        });
    }

    await touchTelegramIdentityLastLogin(authIdentity.id);
    await recordAuthSecurityEvent({
        type: AuthSecurityEventType.LOGIN_TELEGRAM_SUCCEEDED,
        actorUserId: user.id,
        targetUserId: user.id,
        req,
    });

    return completeTelegramLoginSession(user, req, res);
};

export const unlinkTelegram = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            throw ApiError.UnauthorizedError();
        }
        if (await denyIfNotAdmin(req, user, AuthSecurityEventType.TELEGRAM_UNLINKED)) {
            throw new ApiError(403, 'Недоступно для вашей роли');
        }

        const removed = await unlinkTelegramIdentity(user.id);
        if (!removed) {
            throw new ApiError(404, 'Telegram не подключён');
        }

        await recordAuthSecurityEvent({
            type: AuthSecurityEventType.TELEGRAM_UNLINKED,
            actorUserId: user.id,
            targetUserId: user.id,
            req,
        });

        return res.status(200).json({ message: 'Telegram отключён' });
    } catch (error) {
        next(error);
    }
};

export const getTelegramStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            throw ApiError.UnauthorizedError();
        }

        const identity = await findTelegramIdentityByUserId(user.id);
        if (!identity) {
            return res.status(200).json({ linked: false });
        }

        return res.status(200).json({
            linked: true,
            username: identity.username,
            displayName: identity.displayName,
            linkedAt: identity.linkedAt,
            lastLoginAt: identity.lastLoginAt,
        });
    } catch (error) {
        next(error);
    }
};

export const getAuthProviders = async (_req: Request, res: Response) => {
    return res.status(200).json({ telegram: isTelegramOidcConfigured() });
};
