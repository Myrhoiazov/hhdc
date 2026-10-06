import crypto from 'crypto';
import argon2 from 'argon2';
import { authentication } from '../../common/utils/crypto';
import { COMMON_PASSWORDS } from './auth.common-passwords';

const ARGON2_OPTIONS = {
    type: argon2.argon2id,
    memoryCost: 19 * 1024,
    timeCost: 2,
    parallelism: 1,
};

export const hashPassword = (password: string) => argon2.hash(password, ARGON2_OPTIONS);

export const verifyPassword = async (
    storedHash: string,
    legacySalt: string | null,
    password: string,
) => {
    if (storedHash.startsWith('$argon2')) {
        try {
            return {
                valid: await argon2.verify(storedHash, password),
                needsUpgrade: argon2.needsRehash(storedHash, ARGON2_OPTIONS),
            };
        } catch {
            return { valid: false, needsUpgrade: false };
        }
    }

    if (!legacySalt) return { valid: false, needsUpgrade: false };

    const expectedHash = authentication(legacySalt, password);
    const expected = Buffer.from(expectedHash, 'hex');
    const actual = Buffer.from(storedHash, 'hex');
    const valid = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    return { valid, needsUpgrade: valid };
};

export const isPasswordAllowed = (password: string) => password.length >= 12 && password.length <= 128;

const commonPasswordSet = new Set(COMMON_PASSWORDS.map((entry) => entry.toLowerCase()));

export const isCommonPassword = (password: string) => commonPasswordSet.has(password.toLowerCase());
