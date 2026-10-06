import { NextFunction, Request, Response } from 'express';
import { calculateProgressiveDelayMs, hitRateLimit, resetRateLimit } from './auth.rate-limit.service';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

// Coarse, IP-only throttle on top of the per-challenge attempts/resendCount
// counters already enforced in service.TwoFactorAuth.ts — this exists to slow
// down someone spraying requests across many different pending-challenge cookies,
// not to be the primary defense against guessing one code.
const keyFor = (req: Request) => `rate-limit:2fa:${req.ip}`;

export const twoFactorRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    const key = keyFor(req);
    const result = await hitRateLimit({
        key,
        windowMs: WINDOW_MS,
        maxAttempts: MAX_ATTEMPTS,
    });

    if (result.limited) {
        res.setHeader('Retry-After', result.retryAfterSeconds);
        res.status(429).json({ message: 'Слишком много попыток. Попробуйте позже.' });
        return;
    }

    res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            void resetRateLimit(key);
        }
    });

    const delayMs = calculateProgressiveDelayMs(result.count);
    if (delayMs > 0) {
        setTimeout(next, delayMs);
        return;
    }

    next();
};
