import { createHmac, timingSafeEqual } from 'node:crypto';

export type VerifyInitDataResult =
    | { ok: true; telegramUserId: string; firstName?: string; lastName?: string; username?: string }
    | { ok: false; reason: string };

const MAX_AGE_SECONDS = 24 * 60 * 60;
const FUTURE_SKEW_SECONDS = 60;

interface TelegramInitDataUser {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
}

// secret_key = HMAC_SHA256(bot_token, key="WebAppData"); hash = HEX(HMAC_SHA256(data_check_string, key=secret_key)).
// Mutates `params` (deletes "hash") since the check string is computed over every other field —
// callers rely on that to read the remaining fields afterward without doing it themselves.
const verifyInitDataSignature = (params: URLSearchParams, botToken: string): string | null => {
    const hash = params.get('hash');
    if (!hash) return 'missing hash';
    if (!/^[a-f0-9]{64}$/i.test(hash)) return 'malformed hash';
    params.delete('hash');

    const dataCheckString = Array.from(params.entries())
        .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    let hashBuffer: Buffer;
    let computedBuffer: Buffer;
    try {
        hashBuffer = Buffer.from(hash, 'hex');
        computedBuffer = Buffer.from(computedHash, 'hex');
    } catch {
        return 'malformed hash';
    }
    if (hashBuffer.length !== computedBuffer.length || !timingSafeEqual(hashBuffer, computedBuffer)) {
        return 'invalid signature';
    }
    return null;
};

const checkAuthDateFreshness = (params: URLSearchParams, now: () => Date): string | null => {
    const authDateRaw = params.get('auth_date');
    if (!authDateRaw) return 'missing auth_date';
    const authDateSeconds = Number(authDateRaw);
    if (!/^\d+$/.test(authDateRaw) || !Number.isSafeInteger(authDateSeconds)) return 'malformed auth_date';
    const ageSeconds = now().getTime() / 1000 - authDateSeconds;
    if (ageSeconds > MAX_AGE_SECONDS) return 'initData expired';
    if (ageSeconds < -FUTURE_SKEW_SECONDS) return 'initData auth_date is in the future';
    return null;
};

const parseInitDataUser = (params: URLSearchParams): TelegramInitDataUser | { reason: string } => {
    const userRaw = params.get('user');
    if (!userRaw) return { reason: 'missing user field' };
    let parsedUser: TelegramInitDataUser;
    try {
        parsedUser = JSON.parse(userRaw);
    } catch {
        return { reason: 'malformed user field' };
    }
    if (!parsedUser || typeof parsedUser.id !== 'number' || !Number.isSafeInteger(parsedUser.id) || parsedUser.id <= 0) {
        return { reason: 'missing user.id' };
    }
    return parsedUser;
};

// Telegram's documented WebApp initData check: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
export const verifyTelegramInitData = (
    initData: string,
    botToken: string,
    now: () => Date = () => new Date(),
): VerifyInitDataResult => {
    const params = new URLSearchParams(initData);
    const keys = Array.from(params.keys());
    if (new Set(keys).size !== keys.length) return { ok: false, reason: 'duplicate fields' };

    const signatureError = verifyInitDataSignature(params, botToken);
    if (signatureError) return { ok: false, reason: signatureError };

    const freshnessError = checkAuthDateFreshness(params, now);
    if (freshnessError) return { ok: false, reason: freshnessError };

    const userResult = parseInitDataUser(params);
    if ('reason' in userResult) return { ok: false, reason: userResult.reason };

    return {
        ok: true,
        telegramUserId: String(userResult.id),
        firstName: userResult.first_name,
        lastName: userResult.last_name,
        username: userResult.username,
    };
};
