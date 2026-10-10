import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { ProviderName, ProviderStatus, ProviderType, ProviderConnection } from '@prisma/client';
import { z } from 'zod';
import { ApiError } from '../../common/http';

export const providerSchema = z.object({
    name: z.string().trim().min(1).max(200), 
    type: z.nativeEnum(ProviderType), 
    provider: z.nativeEnum(ProviderName),
    status: z.nativeEnum(ProviderStatus).optional(), 
    credentials: z.record(z.string()).optional(),
    settings: z.object({ 
        model: z.string().max(200).optional(), 
        embeddingModel: z.string().max(200).optional(), 
        sender: z.string().email().optional(), 
        eventId: z.string().uuid().optional(), 
        baseUrl: z.string().url().optional(), 
        externalEventId: z.string().max(200).optional(),
        imapHost: z.string().trim().min(1).max(255).optional(),
        imapPort: z.number().int().min(1).max(65535).optional(),
        imapSecure: z.boolean().optional(),
        smtpHost: z.string().trim().min(1).max(255).optional(),
        smtpPort: z.number().int().min(1).max(65535).optional(),
        smtpSecure: z.boolean().optional(),
        // Shown to recipients next to the address: "High Heels Dance Camp <info@…>".
        senderName: z.string().trim().max(120).optional(),
        // HTML footer added to every email sent from this mailbox.
        signatureHtml: z.string().max(20000).optional(),
    }).strict().optional(),
}).strict();

// The safe selection intentionally excludes `credentialsEncrypted`
export const safeProviderSelect = { 
    id: true, 
    name: true, 
    type: true, 
    provider: true, 
    status: true, 
    settings: true, 
    lastSyncAt: true, 
    lastError: true, 
    lastAttemptAt: true, 
    lastSuccessAt: true, 
    lastFailureAt: true, 
    activeForGeneration: true,
    createdAt: true, 
    updatedAt: true 
};

export type SafeProviderDTO = Omit<ProviderConnection, 'credentialsEncrypted'>;

const encryptionKey = () => {
    const key = Buffer.from(process.env.APP_ENCRYPTION_KEY ?? '', 'base64');
    if (key.length !== 32) throw new ApiError(503, 'ENCRYPTION_NOT_CONFIGURED', 'Provider encryption is not configured');
    return key;
};

export const encryptCredentials = (credentials: Record<string, string>) => {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(credentials), 'utf8'), cipher.final()]);
    return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join('.');
};

export const decryptCredentials = (encrypted: string): Record<string, string> => {
    const [iv, tag, ciphertext] = encrypted.split('.').map(value => Buffer.from(value, 'base64'));
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return z.record(z.string()).parse(JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')));
};

export const validateProviderType = (provider: ProviderName, type: ProviderType) => {
    const allowed: Record<string, string> = { 
        WEEZTIX: 'TICKETING', 
        GMAIL: 'EMAIL', 
        IMAP: 'EMAIL',
        OPENAI: 'AI', 
        OLLAMA: 'AI',
        MOLLIE: 'PAYMENT',
        GOOGLE_DRIVE: 'STORAGE',
    };
    if (allowed[provider] !== type) {
        throw new ApiError(400, 'PROVIDER_TYPE_MISMATCH', 'Provider does not support this type');
    }
};
