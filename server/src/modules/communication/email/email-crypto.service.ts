import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const SECRET_VERSION = 'v1';

const getEncryptionKey = () => {
    const secret = process.env.EMAIL_CREDENTIALS_ENCRYPTION_KEY ?? process.env.SECRET_SALT;

    if (!secret) {
        throw new Error('EMAIL_CREDENTIALS_ENCRYPTION_KEY or SECRET_SALT is required');
    }

    return createHash('sha256').update(secret).digest();
};

export const encryptEmailSecret = (value: string) => {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [SECRET_VERSION, iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join('.');
};

export const decryptEmailSecret = (value: string) => {
    const [version, iv, authTag, encrypted] = value.split('.');

    if (version !== SECRET_VERSION || !iv || !authTag || !encrypted) {
        throw new Error('Unsupported email secret format');
    }

    const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    return Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'base64')),
        decipher.final(),
    ]).toString('utf8');
};
