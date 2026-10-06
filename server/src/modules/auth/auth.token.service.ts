import crypto from 'crypto';
import dayjs from 'dayjs';
import prisma from '../../../prisma/prisma-client'
import ApiError from '../../common/errors/api-error';
import { timingSafeEqualStrings } from '../../common/utils/crypto';
import { getUserById } from '../users/users.service';

const Session = prisma.session
const SESSION_DAYS = 7;

export interface SessionUserPayload {
    id: string;
    email: string;
    role: string;
    authVersion: number;
}

const sessionSecret = () => process.env.SESSION_TOKEN_SECRET || process.env.JWT_REFRESH_SECRET || process.env.JWT_ACCESS_SECRET;

export const generateSessionToken = () => crypto.randomBytes(32).toString('base64url');

export const hashSessionToken = (token: string) => {
    const secret = sessionSecret();
    if (!secret) {
        throw new Error('SESSION_TOKEN_SECRET or JWT_REFRESH_SECRET is required');
    }
    return crypto.createHmac('sha256', secret).update(token).digest('hex');
};

const userResponse = (user: Awaited<ReturnType<typeof getUserById>>) => {
    if (!user) return null;
    return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isEnabled: user.isEnabled,
        lastLogin: user.lastLogin,
    };
};


export const saveToken = async (userId: number, sessionToken: string, ipAddress: string, userAgent: string | null) => {
    return Session.create({
        data: {
            userId,
            tokenHash: hashSessionToken(sessionToken),
            refreshToken: null,
            ipAddress,
            userAgent,
            lastUsedAt: new Date(),
            expiresAt: dayjs().add(SESSION_DAYS, 'days').toDate(),
        },
    });
}

export const removeToken = async (sessionToken: string) => {
    if (!sessionToken) return null;
    return Session.deleteMany({ where: { tokenHash: hashSessionToken(sessionToken) } })
}

export const findToken = async (sessionToken: string) => {
    if (!sessionToken) return null;
    const tokenHash = hashSessionToken(sessionToken);
    const tokenData = await Session.findUnique({
        where: { tokenHash },
        include: { user: true },
    });
    return tokenData;
}

export const replaceToken = async (
    oldSessionToken: string,
    userId: number,
    newSessionToken: string,
    ipAddress: string,
    userAgent: string | null,
) => prisma.$transaction(async (transaction) => {
    const deleted = await transaction.session.deleteMany({
        where: {
            tokenHash: hashSessionToken(oldSessionToken),
            userId,
            isRevoked: false,
            expiresAt: { gt: new Date() },
        },
    });
    if (deleted.count !== 1) {
        throw ApiError.UnauthorizedError();
    }
    return transaction.session.create({
        data: {
            userId,
            tokenHash: hashSessionToken(newSessionToken),
            refreshToken: null,
            ipAddress,
            userAgent,
            lastUsedAt: new Date(),
            expiresAt: dayjs().add(SESSION_DAYS, 'days').toDate(),
        },
    });
});

export const refreshToken = async (token: string) => {
    if (!token) {
        throw ApiError.UnauthorizedError()
    }

    const findDataSession = await findToken(token)

    if (
        !findDataSession
        || findDataSession.isRevoked
        || findDataSession.expiresAt <= new Date()
        || !findDataSession.user.isEnabled
    ) {
        throw ApiError.UnauthorizedError()
    }

    const user = await getUserById(findDataSession.userId)

    if (!user || !user.isEnabled || user.authVersion !== findDataSession.user.authVersion) {
        throw ApiError.UnauthorizedError()
    }

    const newSessionToken = generateSessionToken();

    return { newSessionToken, user: userResponse(user) }
}

export const getUserByOpaqueSessionToken = async (sessionToken: string) => {
    const session = await findToken(sessionToken);

    if (
        !session
        || session.isRevoked
        || session.expiresAt <= new Date()
        || !session.user.isEnabled
    ) {
        return null;
    }

    const user = await getUserById(session.userId);
    if (!user || !user.isEnabled || user.authVersion !== session.user.authVersion) {
        return null;
    }

    await Session.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() },
    });

    return { ...session, user };
};

export const listUserSessions = async (userId: number, currentSessionToken: string) => {
    const currentTokenHash = currentSessionToken ? hashSessionToken(currentSessionToken) : null;
    const sessions = await Session.findMany({
        where: {
            userId,
            isRevoked: false,
            expiresAt: { gt: new Date() },
        },
        orderBy: [
            { lastUsedAt: 'desc' },
            { createdAt: 'desc' },
        ],
        select: {
            id: true,
            tokenHash: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
            lastUsedAt: true,
            expiresAt: true,
        },
    });

    return sessions.map(({ tokenHash, ...session }) => ({
        ...session,
        isCurrent: Boolean(currentTokenHash && timingSafeEqualStrings(tokenHash, currentTokenHash)),
    }));
};

export const revokeUserSession = async (userId: number, sessionId: number) => {
    const result = await Session.updateMany({
        where: {
            id: sessionId,
            userId,
            isRevoked: false,
        },
        data: {
            isRevoked: true,
            revokedAt: new Date(),
        },
    });
    return result.count > 0;
};

export const revokeOtherUserSessions = async (userId: number, currentSessionToken: string) => {
    const currentTokenHash = hashSessionToken(currentSessionToken);
    return Session.updateMany({
        where: {
            userId,
            isRevoked: false,
            tokenHash: { not: currentTokenHash },
        },
        data: {
            isRevoked: true,
            revokedAt: new Date(),
        },
    });
};
