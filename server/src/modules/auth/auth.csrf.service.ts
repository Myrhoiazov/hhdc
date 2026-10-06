import crypto from 'crypto';

const csrfSecret = () => process.env.CSRF_SECRET
    || process.env.SESSION_TOKEN_SECRET
    || process.env.JWT_REFRESH_SECRET
    || process.env.JWT_ACCESS_SECRET;

export const CSRF_HEADER = 'x-csrf-token';

export const createCsrfToken = (sessionToken: string) => {
    const secret = csrfSecret();
    if (!secret) {
        throw new Error('CSRF_SECRET or session secret is required');
    }
    return crypto.createHmac('sha256', secret).update(sessionToken).digest('hex');
};

export const verifyCsrfToken = (sessionToken: string, csrfToken: string) => {
    const expected = Buffer.from(createCsrfToken(sessionToken), 'hex');
    const actual = Buffer.from(csrfToken, 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};
