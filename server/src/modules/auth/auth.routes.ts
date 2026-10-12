import { Router, Request } from 'express';
import { route } from '../../common/http';
import { authenticated, COOKIE_NAME, currentUser } from './auth.middleware';
import { performLogout } from './auth.service';
import { login, resendTwoFactor, verifyTwoFactor } from './auth.controller';
import { loginRateLimit } from './auth.login-rate-limit.middleware';
import { twoFactorResendRateLimit, twoFactorVerifyRateLimit } from './auth.two-factor-rate-limit.middleware';

export const authRouter = Router();

authRouter.post('/login', loginRateLimit, login);
authRouter.post('/login/2fa/verify', twoFactorVerifyRateLimit, route(verifyTwoFactor));
authRouter.post('/login/2fa/resend', twoFactorResendRateLimit, route(resendTwoFactor));

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
