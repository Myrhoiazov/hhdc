import { NextFunction, Request, Response } from 'express';
import { recordSecurityEvent } from './auth.middleware';
import { calculateProgressiveDelayMs, hitRateLimit, resetRateLimit } from './auth.rate-limit.service';
import { CAPTCHA_THRESHOLD, captchaSiteKey, isCaptchaConfigured, verifyCaptchaToken } from './auth.captcha.service';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type LoginRateLimitResult = { limited: boolean; count: number; retryAfterSeconds: number; store: string };

// An address is at most 320 characters; the cut keeps a huge body from becoming a huge key.
const MAX_EMAIL_LENGTH = 320;

const emailFromBody = (req: Request): string => (
    typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, MAX_EMAIL_LENGTH) : 'unknown'
);

const keyFor = (req: Request) => `rate-limit:login:${req.ip}:${emailFromBody(req)}`;

const recordBlocked = (req: Request, result: LoginRateLimitResult): void => {
    recordSecurityEvent(req, 'LOGIN_BLOCKED', {
        email: emailFromBody(req),
        retryAfterSeconds: String(result.retryAfterSeconds),
        count: String(result.count),
        store: result.store,
    });
};

const respondBlocked = (res: Response, result: LoginRateLimitResult): void => {
    res.setHeader('Retry-After', result.retryAfterSeconds);
    res.status(429).json({ error: { code: 'LOGIN_RATE_LIMIT', message: 'Too many login attempts. Try again later.', requestId: res.locals.requestId } });
};

// null when the attempt count hasn't reached CAPTCHA_THRESHOLD (or captcha isn't configured) —
// distinct from "checked and failed" so the caller only responds when a check actually ran.
const checkCaptchaIfRequired = async (req: Request, result: LoginRateLimitResult): Promise<{ valid: boolean; token: string } | null> => {
    if (result.count < CAPTCHA_THRESHOLD || !isCaptchaConfigured()) return null;
    const token = typeof req.body?.captchaToken === 'string' ? req.body.captchaToken : '';
    const valid = token ? await verifyCaptchaToken(token, req.ip) : false;
    return { valid, token };
};

const respondCaptchaRequired = (res: Response, token: string): void => {
    res.status(400).json({
        error: {
            code: token ? 'CAPTCHA_INVALID' : 'CAPTCHA_REQUIRED',
            message: 'Confirm that you are not a robot and try again.',
            siteKey: captchaSiteKey(),
            requestId: res.locals.requestId,
        },
    });
};

export const loginRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    const key = keyFor(req);
    const result = await hitRateLimit({ key, windowMs: WINDOW_MS, maxAttempts: MAX_ATTEMPTS });
    res.locals.loginRateLimitCount = result.count;

    if (result.limited) {
        recordBlocked(req, result);
        respondBlocked(res, result);
        return;
    }

    const captcha = await checkCaptchaIfRequired(req, result);
    if (captcha && !captcha.valid) {
        respondCaptchaRequired(res, captcha.token);
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
