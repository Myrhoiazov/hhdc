import { NextFunction, Request, Response } from 'express';
import { AuthSecurityEventType } from '@prisma/client';
import { recordAuthSecurityEvent } from './auth.security-audit.service';
import { calculateProgressiveDelayMs, hitRateLimit, resetRateLimit } from './auth.rate-limit.service';
import { CAPTCHA_THRESHOLD, captchaSiteKey, isCaptchaConfigured, verifyCaptchaToken } from './auth.captcha.service';
import { notifyLoginBlocked } from '../communication';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type LoginRateLimitResult = { limited: boolean; count: number; retryAfterSeconds: number; store: string };

const emailFromBody = (req: Request): string => (
    typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : 'unknown'
);

const keyFor = (req: Request) => `rate-limit:login:${req.ip}:${emailFromBody(req)}`;

const recordAndNotifyBlocked = (req: Request, result: LoginRateLimitResult): void => {
    const email = emailFromBody(req);
    void recordAuthSecurityEvent({
        type: AuthSecurityEventType.LOGIN_BLOCKED,
        req,
        metadata: { email, retryAfterSeconds: result.retryAfterSeconds, count: result.count, store: result.store },
    });
    void notifyLoginBlocked({ email, ip: req.ip, retryAfterSeconds: result.retryAfterSeconds })
        .catch((error) => console.error('Failed to send login-blocked Telegram notification:', error));
};

const respondBlocked = (res: Response, result: LoginRateLimitResult): void => {
    res.setHeader('Retry-After', result.retryAfterSeconds);
    res.status(429).json({ message: 'Слишком много попыток входа. Попробуйте позже.' });
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
        code: token ? 'CAPTCHA_INVALID' : 'CAPTCHA_REQUIRED',
        message: 'Подтвердите, что вы не робот, и попробуйте снова.',
        siteKey: captchaSiteKey(),
    });
};

export const loginRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    const key = keyFor(req);
    const result = await hitRateLimit({ key, windowMs: WINDOW_MS, maxAttempts: MAX_ATTEMPTS });
    res.locals.loginRateLimitCount = result.count;

    if (result.limited) {
        recordAndNotifyBlocked(req, result);
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
