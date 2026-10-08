import { logger } from '../../common/logger';
import { sendTelegramNotification } from '../../integrations/telegram/notify';
import type { Announce } from './notifications.types';
import { isNotificationEnabled } from './settings';

// The one way other modules send a Telegram notification. It never throws and never waits on the
// caller's transaction: a message that could not be sent is logged and forgotten.
export const announce: Announce = async (key, message) => {
    try {
        if (!await isNotificationEnabled(key)) return false;
        return await (typeof message === 'string' ? sendTelegramNotification(message) : message());
    } catch {
        logger.warn(`[telegram] notification ${key} failed`);
        return false;
    }
};
