import { logger } from '../../common/logger';

export interface TelegramNotificationConfig {
    token: string;
    chatId: string;
    clientUrl: string;
}

interface NotifyOptions {
    config?: TelegramNotificationConfig | null;
    fetchImpl?: typeof fetch;
    now?: number;
}

const ANNOUNCE_WINDOW_MS = 24 * 60 * 60_000;

// Imported mailbox history is not news: only mail known to have arrived recently is announced.
const arrivedRecently = (receivedAt: unknown, now: number): boolean => {
    const arrived = typeof receivedAt === 'string' ? Date.parse(receivedAt) : Number.NaN;
    return !Number.isNaN(arrived) && now - arrived <= ANNOUNCE_WINDOW_MS;
};

const configuredNotifier = (): TelegramNotificationConfig | null => {
    const token = process.env.TELEGRAM_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_EMAIL_NOTIFY_CHAT_ID?.trim();
    if (!token || !chatId || !/^-?\d+$/.test(chatId)) return null;
    return { token, chatId, clientUrl: (process.env.CLIENT_URL ?? '').replace(/\/$/, '') };
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

export const notifyEmailReceived = (payload: Record<string, unknown>, options: NotifyOptions = {}) => {
    const config = options.config === undefined ? configuredNotifier() : options.config;
    if (!config || typeof payload.conversationId !== 'string') return Promise.resolve(false);
    if (!arrivedRecently(payload.receivedAt, options.now ?? Date.now())) return Promise.resolve(false);
    const inboxUrl = config.clientUrl ? `\n${config.clientUrl}/email` : '';
    return sendTelegramNotification(`📨 New inbound email${inboxUrl}`, { ...options, config });
};

export const notifyEmailSyncFailed = (connectionId: string, options: NotifyOptions = {}) =>
    sendTelegramNotification(`⚠️ Email sync failed\nMailbox: ${connectionId}`, options);
