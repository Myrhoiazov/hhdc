// The parts of the Telegram Bot API that a bot with buttons needs: sending a message with an
// inline keyboard, hearing which button was pressed, and answering the press.

export type InlineButton = { text: string; callback_data: string } | { text: string; url: string };
export type InlineKeyboard = InlineButton[][];

export interface TelegramCallbackQuery {
    id: string;
    data?: string;
    from?: { id?: number; first_name?: string };
    message?: { message_id?: number; chat?: { id?: number } };
}
export interface TelegramUpdate { update_id: number; callback_query?: TelegramCallbackQuery }

export interface BotContext { token: string; fetchImpl?: typeof fetch }
export interface OutgoingMessage { chatId: string | number; text: string; keyboard?: InlineKeyboard; replyToMessageId?: number }

interface ApiReply<T> { ok: boolean; result?: T; description?: string }

const REQUEST_TIMEOUT_MS = 10_000;
// getUpdates waits this long for news before answering with an empty list.
export const LONG_POLL_SECONDS = 25;

const call = async <T>(bot: BotContext, method: string, payload: Record<string, unknown>, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> => {
    const response = await (bot.fetchImpl ?? fetch)(`https://api.telegram.org/bot${bot.token}/${method}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(timeoutMs),
    });
    const reply = await response.json() as ApiReply<T>;
    if (!reply.ok) throw new Error(`Telegram ${method} failed: ${reply.description ?? response.status}`);
    return reply.result as T;
};

export const sendBotMessage = async (bot: BotContext, message: OutgoingMessage): Promise<number> => {
    const sent = await call<{ message_id: number }>(bot, 'sendMessage', {
        chat_id: message.chatId, text: message.text, parse_mode: 'HTML', disable_web_page_preview: true,
        ...(message.keyboard ? { reply_markup: { inline_keyboard: message.keyboard } } : {}),
        ...(message.replyToMessageId ? { reply_to_message_id: message.replyToMessageId, allow_sending_without_reply: true } : {}),
    });
    return sent.message_id;
};

export const removeButtons = async (bot: BotContext, chatId: string | number, messageId: number): Promise<void> => {
    await call(bot, 'editMessageReplyMarkup', { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } });
};

// Stops the spinner on the pressed button; `alert` shows the text as a pop-up instead of a toast.
export const answerCallback = async (bot: BotContext, callbackId: string, text: string, alert = false): Promise<void> => {
    await call(bot, 'answerCallbackQuery', { callback_query_id: callbackId, text: text.slice(0, 200), show_alert: alert });
};

export const fetchUpdates = (bot: BotContext, offset?: number): Promise<TelegramUpdate[]> => call<TelegramUpdate[]>(bot, 'getUpdates', {
    timeout: LONG_POLL_SECONDS, allowed_updates: ['callback_query'], ...(offset === undefined ? {} : { offset }),
}, (LONG_POLL_SECONDS + 10) * 1000);

// A bot delivers button presses either to a webhook or to getUpdates, never to both.
export const webhookUrl = async (bot: BotContext): Promise<string> => (await call<{ url?: string }>(bot, 'getWebhookInfo', {})).url ?? '';
