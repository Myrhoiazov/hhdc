import { createHash, createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { z } from 'zod';
import type { Request } from 'express';

const sessionLifetime = 8 * 60 * 60 * 1000;
const attempts = new Map<string, { count: number; expiresAt: number }>();

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

export const checkLoginLimit = (key: string) => {
    const now = Date.now();
    for (const [id, entry] of attempts) {
        if (entry.expiresAt < now) attempts.delete(id);
    }
    const entry = attempts.get(key) ?? { count: 0, expiresAt: now + 15 * 60 * 1000 };
    entry.count += 1;
    attempts.set(key, entry);
    if (entry.count > 10) throw new ApiError(429, 'LOGIN_RATE_LIMIT', 'Too many login attempts');
};

export const loginSchema = z.object({ 
    email: z.string().email().transform(v => v.toLowerCase()), 
    password: z.string().min(1).max(256) 
}).strict();

export const performLogin = async (req: Request) => {
    const input = loginSchema.parse(req.body);
    const attemptKey = `${req.ip}:${input.email}`;
    
    checkLoginLimit(attemptKey);
    
    const user = await prisma.user.findUnique({ where: { email: input.email }, include: userInclude });
    
    if (!user?.isActive || !await argon2.verify(user.passwordHash, input.password)) {
        throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + sessionLifetime);
    
    await prisma.session.create({ 
        data: { tokenHash: hashSession(token), userId: user.id, expiresAt } 
    });
    
    attempts.delete(attemptKey);
    
    return { token, expiresAt, user: publicUser(user) };
};

export const performLogout = async (token: string) => {
    await prisma.session.deleteMany({ where: { tokenHash: hashSession(token) } });
};
