import { createHash, createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { z } from 'zod';

const sessionLifetime = 8 * 60 * 60 * 1000;

export const sessionSecret = () => {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
    return secret;
};

export const hashSession = (token: string) => createHash('sha256').update(token).digest('hex');
export const csrfForSession = (token: string, secret: string) => createHmac('sha256', secret).update(token).digest('hex');
export const tokensEqual = (actual: string, expected: string) => actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));

const userInclude = { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } };

export interface CurrentUser { 
    id: string; 
    email: string; 
    name: string; 
    roles: string[]; 
    permissions: string[] 
}

export const publicUser = (user: any): CurrentUser => ({
    id: user.id, 
    email: user.email, 
    name: user.name,
    roles: user.roles.map((item: any) => item.role.name),
    permissions: [...new Set(user.roles.flatMap((item: any) => item.role.permissions.map((entry: any) => entry.permission.key)) as string[])],
});

export const loadUser = (id: string) => prisma.user.findUnique({ where: { id }, include: userInclude });

export const loginSchema = z.object({ 
    email: z.string().email().transform(v => v.toLowerCase()), 
    password: z.string().min(1).max(256),
    captchaToken: z.string().min(1).max(4096).optional(),
}).strict();

export const twoFactorVerifySchema = z.object({
    code: z.string().regex(/^\d{6}$/, 'The code must be 6 digits'),
    trustDevice: z.boolean().optional(),
}).strict();

export type AuthenticatedUser = NonNullable<Awaited<ReturnType<typeof loadUser>>>;

// Compared against when the address is unknown, so a missing account takes as long to refuse
// as a wrong password and cannot be told apart by timing.
const placeholderHash = argon2.hash(randomBytes(16).toString('hex'));

// Checks the password only; whether a session starts right away is decided by the caller.
export const authenticateUser = async (email: string, password: string): Promise<AuthenticatedUser> => {
    const user = await prisma.user.findUnique({ where: { email }, include: userInclude });
    const passwordMatches = await argon2.verify(user?.passwordHash ?? await placeholderHash, password);
    
    if (!user?.isActive || !passwordMatches) {
        throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    
    return user;
};

export const createSession = async (userId: string) => {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + sessionLifetime);
    
    await prisma.session.create({ 
        data: { tokenHash: hashSession(token), userId, expiresAt } 
    });
    
    return { token, expiresAt };
};

export const performLogout = async (token: string) => {
    await prisma.session.deleteMany({ where: { tokenHash: hashSession(token) } });
};
