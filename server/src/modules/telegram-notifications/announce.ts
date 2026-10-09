import { logger } from '../../common/logger';
import { sendTelegramNotification } from '../../integrations/telegram/notify';
import type { Announce, NotificationKey } from './notifications.types';
import { sendingOf } from './settings';
import { fitMessage, renderTemplate } from './templates';

// The one way other modules send a Telegram notification. It never throws and never waits on the
// caller's transaction: a message that could not be sent is logged and forgotten.
const sendWhenOn = async (key: NotificationKey, text: (template: string) => string): Promise<boolean> => {
    try {
        const sending = await sendingOf(key);
        const message = sending.enabled ? fitMessage(text(sending.template)) : '';
        return message ? await sendTelegramNotification(message) : false;
    } catch {
        logger.warn(`[telegram] notification ${key} failed`);
        return false;
    }
};

export const announce: Announce = (key, values) => sendWhenOn(key, template => renderTemplate(template, values));

// A line that belongs to a notification but is not its text — "…and 12 more". It follows the
// same switch as the notification itself.
export const announceLine = (key: NotificationKey, line: string): Promise<boolean> => sendWhenOn(key, () => line);
