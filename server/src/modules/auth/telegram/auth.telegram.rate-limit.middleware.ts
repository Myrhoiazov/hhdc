import { NextFunction, Request, Response } from 'express';
import { hitRateLimit } from '../auth.rate-limit.service';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

const respondLimited = (res: Response, retryAfterSeconds: number) => {
    res.setHeader('Retry-After', retryAfterSeconds);
    res.status(429).json({ message: 'Слишком много попыток через Telegram. Попробуйте позже.' });
};

// Looser than auth.login-rate-limit.middleware.ts's 5/15min (no password to
// guess here) — these three guard the three Telegram entry points against
// being hammered, reusing the same Redis/in-memory building block. Keyed
// per-endpoint so hitting one doesn't burn the budget for the others.

// Unauthenticated entry point — keyed by IP, there's no user yet.
export const telegramLoginRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    const result = await hitRateLimit({
        key: `rate-limit:telegram-login:${req.ip}`,
        windowMs: WINDOW_MS,
        maxAttempts: MAX_ATTEMPTS,
    });
    if (result.limited) {
        respondLimited(res, result.retryAfterSeconds);
        return;
    }
    next();
};

// Authenticated, ADMIN-only — keyed by user id (isToken already ran, req.user
// is set) rather than IP, so it can't be used to lock other admins out from a
// shared office IP.
export const telegramLinkRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    const result = await hitRateLimit({
        key: `rate-limit:telegram-link:${req.user?.id ?? req.ip}`,
        windowMs: WINDOW_MS,
        maxAttempts: MAX_ATTEMPTS,
    });
    if (result.limited) {
        respondLimited(res, result.retryAfterSeconds);
        return;
    }
    next();
};

// The callback is where the real work happens (code exchange + JWT
// verification) — a valid state/code pair isn't guessable, but this still
// bounds wasted work from a client hammering the endpoint with garbage.
export const telegramCallbackRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    const result = await hitRateLimit({
        key: `rate-limit:telegram-callback:${req.ip}`,
        windowMs: WINDOW_MS,
        maxAttempts: MAX_ATTEMPTS,
    });
    if (result.limited) {
        respondLimited(res, result.retryAfterSeconds);
        return;
    }
    next();
};
