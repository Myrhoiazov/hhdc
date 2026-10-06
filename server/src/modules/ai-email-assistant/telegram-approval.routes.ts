import express from 'express';
import { asyncHandler } from '../auth/auth.middleware';
import { telegramWebhookController } from '../../common/telegram/telegram-webhook.controller';

const router = express.Router();

// Shared by both bot features on this one Telegram bot — see
// common/telegram/telegram-update-dispatcher.ts.
router.post('/webhook', asyncHandler(telegramWebhookController));

export default router;
