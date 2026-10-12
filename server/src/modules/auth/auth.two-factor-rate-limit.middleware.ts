import { NextFunction, Request, Response } from 'express';
import { calculateProgressiveDelayMs, hitRateLimit, resetRateLimit } from './auth.rate-limit.service';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

// Coarse, IP-only throttle on top of the per-challenge attempts/resendCount counters already
// enforced in auth.two-factor.service.ts — this exists to slow down someone spraying requests
// across many different pending-challenge cookies, not to be the primary defense against
// guessing one code.
const keyFor = (req: Request) => `rate-limit:2fa:${req.ip}`;

const throttle = async (req: Request, res: Response, next: NextFunction, resetOnSuccess: boolean) => {
    const key = keyFor(req);
    const result = await hitRateLimit({
        key,
        windowMs: WINDOW_MS,
        maxAttempts: MAX_ATTEMPTS,
    });

    if (result.limited) {
        res.setHeader('Retry-After', result.retryAfterSeconds);
        res.status(429).json({ error: { code: 'TWO_FACTOR_RATE_LIMIT', message: 'Too many attempts. Try again later.', requestId: res.locals.requestId } });
        return;
    }

    if (resetOnSuccess) {
        res.on('finish', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                void resetRateLimit(key);
            }
        });
    }

    const delayMs = calculateProgressiveDelayMs(result.count);
    if (delayMs > 0) {
        setTimeout(next, delayMs);
        return;
    }

    next();
};

// A confirmed code ends the guessing, so it clears the counter.
export const twoFactorVerifyRateLimit = (req: Request, res: Response, next: NextFunction) => throttle(req, res, next, true);

// A resend succeeds without knowing the code, so it must never clear the counter: otherwise
// every resend would hand out a fresh batch of guesses.
export const twoFactorResendRateLimit = (req: Request, res: Response, next: NextFunction) => throttle(req, res, next, false);
