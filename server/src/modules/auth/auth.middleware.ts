import type { Request, RequestHandler } from 'express';
import { ApiError } from '../../common/http';
import { sessionSecret, hashSession, csrfForSession, tokensEqual, loadUser, publicUser, CurrentUser } from './auth.service';
import prisma from '../../../prisma/prisma-client';

export const COOKIE_NAME = 'hhdc_session';

export const currentUser = (req: Request): CurrentUser => req.res!.locals.user;

export const hasPermission = (permissions: string[], permission: string) => permissions.includes(permission);

const validateCsrf = (req: Request, expected: string) => {
    const token = req.get('X-CSRF-Token') ?? '';
    if (!tokensEqual(token, expected)) throw new ApiError(403, 'CSRF_FAILED', 'Invalid CSRF token');
};

export const authenticated: RequestHandler = async (req, res, next) => {
    try {
        const token = req.cookies[COOKIE_NAME];
        if (typeof token !== 'string') throw new ApiError(401, 'UNAUTHENTICATED', 'Login required');
        
        const session = await prisma.session.findUnique({ where: { tokenHash: hashSession(token) } });
        if (!session || session.expiresAt.getTime() <= Date.now()) {
            throw new ApiError(401, 'SESSION_EXPIRED', 'Login required');
        }
        
        const user = await loadUser(session.userId);
        if (!user?.isActive) throw new ApiError(401, 'ACCOUNT_DISABLED', 'Login required');
        
        res.locals.user = publicUser(user);
        res.locals.csrfToken = csrfForSession(token, sessionSecret());
        
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            validateCsrf(req, res.locals.csrfToken);
        }
        
        next();
    } catch (error) { 
        next(error); 
    }
};

export const permitted = (permission: string): RequestHandler => (req, _res, next) => {
    const user = currentUser(req);
    if (!user || !hasPermission(user.permissions, permission)) {
        return next(new ApiError(403, 'FORBIDDEN', 'Permission required'));
    }
    next();
};
