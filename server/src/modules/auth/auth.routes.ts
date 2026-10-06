import { Router, Request } from 'express';
import { route } from '../../common/http';
import { authenticated, COOKIE_NAME, currentUser } from './auth.middleware';
import { performLogin, performLogout, sessionSecret, csrfForSession } from './auth.service';

export const authRouter = Router();

authRouter.post('/login', route(async (req: Request) => {
    const { token, expiresAt, user } = await performLogin(req);
    
    req.res!.cookie(COOKIE_NAME, token, { 
        httpOnly: true, 
        sameSite: 'lax', 
        secure: process.env.NODE_ENV === 'production', 
        expires: expiresAt, 
        path: '/api/v1' 
    });
    
    return { 
        user, 
        csrfToken: csrfForSession(token, sessionSecret()) 
    };
}));

authRouter.get('/me', authenticated, route(async (req: Request) => ({
    user: currentUser(req),
    csrfToken: req.res!.locals.csrfToken
})));

authRouter.post('/logout', authenticated, route(async (req: Request) => {
    const token = req.cookies[COOKIE_NAME];
    if (token) {
        await performLogout(token);
    }
    req.res!.clearCookie(COOKIE_NAME, { path: '/api/v1' });
    return { loggedOut: true };
}));
