import { createHash, randomBytes } from 'node:crypto';

export const API_KEY_PREFIX = 'hhdc';

export const hashApiKey = (key: string) => createHash('sha256').update(key).digest('hex');

// The plaintext key exists only in the creation response; the database stores its hash.
export const generateApiKey = () => {
    const prefix = randomBytes(4).toString('hex');
    const key = `${API_KEY_PREFIX}_${prefix}_${randomBytes(32).toString('base64url')}`;
    return { key, prefix, keyHash: hashApiKey(key) };
};

export const looksLikeApiKey = (value: string) => /^hhdc_[0-9a-f]{8}_[A-Za-z0-9_-]{43}$/.test(value);

export const isApiKeyUsable = (apiKey: { status: string; expiresAt: Date | null }, now = new Date()) =>
    apiKey.status === 'ACTIVE' && (!apiKey.expiresAt || apiKey.expiresAt.getTime() > now.getTime());
