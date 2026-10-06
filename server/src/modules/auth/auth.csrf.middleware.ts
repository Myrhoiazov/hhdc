import { NextFunction, Request, Response } from 'express';
import { CSRF_HEADER, verifyCsrfToken } from './auth.csrf.service';

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const cookieName = () => process.env.COOKIE_NAME || 'ddc_refresh';

const allowedOrigins = () => [
    process.env.CLIENT_URL,
    process.env.PUBLIC_SITE_URL,
    process.env.MODE === 'development' ? 'http://localhost:3000' : undefined,
].filter((origin): origin is string => Boolean(origin));

// /auth/login/2fa/* run before any Session exists (same as /auth/login itself) —
// there's no authenticated state yet for a cross-site request to hijack, and the
// ddc_2fa_pending cookie is SameSite=Strict so it isn't even sent cross-origin.
const authPostExempt = new Set(['/auth/login', '/auth/login/2fa/verify', '/auth/login/2fa/resend', '/auth/refresh', '/auth/logout']);

const csrfExempt = (req: Request) => {
    const path = req.path;
    return (
        (req.method === 'POST' && authPostExempt.has(path))
        || path === '/mollie/webhook'
        || path === '/instagram/webhook'
        // Telegram calls this server-to-server with no Origin header and no session/CSRF
        // cookies, exactly like the two webhooks above — its own secret-header check
        // (telegramWebhookSecretIsValid) is the real authentication here. Found live while
        // testing the admin bot: with TELEGRAM_POLLING_ENABLED=false, every webhook POST
        // (both the pre-existing email-draft-approval bot and the new admin bot) was silently
        // 403'd by this middleware before ever reaching the controller.
        || path === '/telegram/webhook'
        // Header requests authenticate exclusively through initData in isAuthenticated;
        // even an invalid header never falls back to a cookie session.
        || Boolean(req.header('x-telegram-init-data')?.trim())
    );
};

const requestOrigin = (req: Request) => {
    const origin = req.get('origin');
    if (origin) return origin;

    const referer = req.get('referer');
    if (!referer) return null;

    try {
        return new URL(referer).origin;
    } catch {
        return null;
    }
};

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
    if (!unsafeMethods.has(req.method) || csrfExempt(req)) {
        next();
        return;
    }

    const origin = requestOrigin(req);
    if (origin && !allowedOrigins().includes(origin)) {
        res.status(403).json({ message: 'CSRF origin check failed' });
        return;
    }
    if (!origin && process.env.MODE !== 'development') {
        res.status(403).json({ message: 'CSRF origin is required' });
        return;
    }

    const sessionToken = req.cookies[cookieName()];
    const csrfToken = req.get(CSRF_HEADER);

    if (!sessionToken || !csrfToken || !verifyCsrfToken(sessionToken, csrfToken)) {
        res.status(403).json({ message: 'CSRF token invalid' });
        return;
    }

    next();
};
