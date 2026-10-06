import { AuthSecurityEventType, Prisma } from '@prisma/client';
import { Request } from 'express';
import prisma from '../../../prisma/prisma-client';

type JsonValue = string | number | boolean | JsonValue[] | { [key: string]: JsonValue };
type SafeMetadata = Record<string, unknown>;

interface AuthSecurityEventInput {
    type: AuthSecurityEventType;
    actorUserId?: number | null;
    targetUserId?: number | null;
    req?: Pick<Request, 'ip' | 'headers'>;
    metadata?: SafeMetadata;
}

const SENSITIVE_KEY_PATTERN = /(password|token|secret|cookie|authorization|csrf|session)/i;

const sanitizeValue = (value: unknown): JsonValue | undefined => {
    if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
        return undefined;
    }
    if (value === null) {
        return undefined;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (Array.isArray(value)) {
        return value
            .map(sanitizeValue)
            .filter((item): item is JsonValue => item !== undefined);
    }
    if (typeof value === 'object') {
        const result: Record<string, JsonValue> = {};
        Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
            if (SENSITIVE_KEY_PATTERN.test(key)) return;
            const sanitized = sanitizeValue(item);
            if (sanitized !== undefined) {
                result[key] = sanitized;
            }
        });
        return result;
    }
    return String(value);
};

export const sanitizeAuthSecurityMetadata = (metadata?: SafeMetadata): Prisma.InputJsonObject | undefined => {
    if (!metadata) return undefined;
    const sanitized = sanitizeValue(metadata);
    return sanitized && !Array.isArray(sanitized) && typeof sanitized === 'object'
        ? sanitized as Prisma.InputJsonObject
        : undefined;
};

export const recordAuthSecurityEvent = async ({
    type,
    actorUserId,
    targetUserId,
    req,
    metadata,
}: AuthSecurityEventInput) => {
    try {
        await prisma.authSecurityEvent.create({
            data: {
                type,
                actorUserId: actorUserId ?? null,
                targetUserId: targetUserId ?? null,
                ipAddress: req?.ip,
                userAgent: typeof req?.headers['user-agent'] === 'string'
                    ? req.headers['user-agent']
                    : null,
                metadata: sanitizeAuthSecurityMetadata(metadata),
            },
        });
    } catch (error) {
        console.error('Failed to record auth security event:', error);
    }
};
