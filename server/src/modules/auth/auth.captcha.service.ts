import axios from 'axios';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Require a captcha once failed login attempts reach this, strictly before
// middleware.LoginRateLimit.ts's hard block (MAX_ATTEMPTS = 5) — an additional
// layer on top of rate limiting, not a replacement for it.
export const CAPTCHA_THRESHOLD = 3;

export const isCaptchaConfigured = () => Boolean(
    process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY,
);

export const captchaSiteKey = () => process.env.TURNSTILE_SITE_KEY ?? null;

interface TurnstileVerifyResponse {
    success: boolean;
    'error-codes'?: string[];
}

export const verifyCaptchaToken = async (token: string, remoteIp?: string): Promise<boolean> => {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret || !token) return false;

    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set('remoteip', remoteIp);

    try {
        const { data } = await axios.post<TurnstileVerifyResponse>(TURNSTILE_VERIFY_URL, body, {
            timeout: 8_000,
        });
        return data.success === true;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error';
        console.error('Turnstile verification request failed:', message);
        return false;
    }
};
