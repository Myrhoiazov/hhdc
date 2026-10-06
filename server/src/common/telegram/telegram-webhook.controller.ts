import type { Request, Response } from 'express';
import { telegramWebhookSecretIsValid } from '../../modules/ai-email-assistant/telegram-approval.controller';
import { dispatchTelegramUpdate } from './telegram-update-dispatcher';

// The one HTTP entry point for the one physical Telegram bot (POST /api/v1/telegram/webhook) —
// see telegram-update-dispatcher.ts for how an update is routed between the email-draft-approval
// feature and the admin operations bot.
export const telegramWebhookController = async (req: Request, res: Response) => {
    if (!telegramWebhookSecretIsValid(req)) {
        res.status(401).json({ message: 'Invalid Telegram webhook secret' });
        return;
    }
    const { status, body } = await dispatchTelegramUpdate(req.body ?? {});
    res.status(status).json(body);
};
