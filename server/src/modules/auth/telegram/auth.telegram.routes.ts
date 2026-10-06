import express from 'express';
import { asyncHandler, isToken } from '../auth.middleware';
import {
    telegramCallbackRateLimit,
    telegramLinkRateLimit,
    telegramLoginRateLimit,
} from './auth.telegram.rate-limit.middleware';
import {
    getTelegramStatus,
    handleTelegramCallback,
    startTelegramLink,
    startTelegramLogin,
    unlinkTelegram,
} from './auth.telegram.controller';

const router = express.Router();

// GET, not POST — the browser performs a full top-level navigation to Telegram
// and back, it never reads a JSON body from these two (see auth.telegram.controller.ts).
router.get('/login/start', telegramLoginRateLimit, asyncHandler(startTelegramLogin));
router.get('/link/start', asyncHandler(isToken), telegramLinkRateLimit, asyncHandler(startTelegramLink));
router.get('/callback', telegramCallbackRateLimit, asyncHandler(handleTelegramCallback));
router.delete('/link', asyncHandler(isToken), asyncHandler(unlinkTelegram));
router.get('/status', asyncHandler(isToken), asyncHandler(getTelegramStatus));

export default router;
