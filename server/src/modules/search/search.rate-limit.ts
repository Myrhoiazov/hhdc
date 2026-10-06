import { NextFunction, Request, Response } from 'express';
import { hitRateLimit } from '../auth/auth.rate-limit.service';

const WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS = 60;

// Ключ по пользователю, а не по IP: роут уже аутентифицирован (isToken выполняется
// раньше в цепочке), и общий офисный IP не должен ограничивать нескольких сотрудников
// одним лимитом.
const keyFor = (req: Request) => `rate-limit:search:${req.user?.id ?? req.ip}`;

export const searchRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    const key = keyFor(req);
    const result = await hitRateLimit({
        key,
        windowMs: WINDOW_MS,
        maxAttempts: MAX_ATTEMPTS,
    });

    if (result.limited) {
        res.setHeader('Retry-After', result.retryAfterSeconds);
        res.status(429).json({ message: 'Слишком много запросов поиска. Попробуйте позже.' });
        return;
    }

    next();
};
