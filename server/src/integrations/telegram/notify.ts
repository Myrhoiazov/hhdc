import { logger } from '../../common/logger';

export interface TelegramNotificationConfig {
    token: string;
    chatId: string;
}

interface NotifyOptions {
    config?: TelegramNotificationConfig | null;
    fetchImpl?: typeof fetch;
}

export const configuredNotifier = (): TelegramNotificationConfig | null => {
    const token = process.env.TELEGRAM_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_EMAIL_NOTIFY_CHAT_ID?.trim();
    if (!token || !chatId || !/^-?\d+$/.test(chatId)) return null;
    return { token, chatId };
};

export const sendTelegramNotification = async (text: string, options: NotifyOptions = {}): Promise<boolean> => {
    const config = options.config === undefined ? configuredNotifier() : options.config;
    if (!config) return false;
    try {
        const response = await (options.fetchImpl ?? fetch)(`https://api.telegram.org/bot${config.token}/sendMessage`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ chat_id: config.chatId, text, disable_web_page_preview: true }),
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error('Telegram rejected notification');
        return true;
    } catch {
        logger.warn('[telegram] notification delivery failed');
        return false;
    }
};
