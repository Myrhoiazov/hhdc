// Shared low-level Telegram Bot API wrapper. Both bot features in this codebase (AI email
// draft approval and the admin operations bot) talk to the same physical bot/token — this is
// the one place that actually calls api.telegram.org, so neither feature duplicates its own
// raw HTTP client.

// A button triggers exactly one of: a bot-side callback (`data` routed through a switch in the
// owning service), a Telegram WebApp (`web_app` — Telegram rejects this with BUTTON_TYPE_INVALID
// outside a private 1:1 chat with the bot, see telegram-admin-bot.menu.ts), or a plain external
// link (`url` — works in any chat type, including groups). Modeled as a union rather than
// optional fields so a caller can't accidentally set more than one.
export type TelegramInlineButton =
    | { text: string; callback_data: string }
    | { text: string; web_app: { url: string } }
    | { text: string; url: string };

export type TelegramInlineKeyboard = TelegramInlineButton[][];

export interface TelegramSentMessage {
    message_id: number;
    chat: { id: number };
}

interface TelegramApiResponse<T> {
    ok: boolean;
    result?: T;
    description?: string;
}

const apiUrl = (token: string, method: string) => `https://api.telegram.org/bot${token}/${method}`;

const requireToken = (): string => {
    const token = process.env.TELEGRAM_TOKEN?.trim();
    if (!token) throw new Error('TELEGRAM_TOKEN is not configured');
    return token;
};

const callTelegramApi = async <T>(
    method: string,
    payload: Record<string, unknown>,
    fetchImpl: typeof fetch,
): Promise<TelegramApiResponse<T>> => {
    const token = requireToken();
    const response = await fetchImpl(apiUrl(token, method), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return response.json() as Promise<TelegramApiResponse<T>>;
};

export interface SendTelegramBotMessageParams {
    chatId: string | number;
    text: string;
    inlineKeyboard?: TelegramInlineKeyboard;
}

export const sendTelegramBotMessage = async (
    params: SendTelegramBotMessageParams,
    fetchImpl: typeof fetch = fetch,
): Promise<TelegramSentMessage> => {
    const body = await callTelegramApi<TelegramSentMessage>('sendMessage', {
        chat_id: params.chatId,
        text: params.text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...(params.inlineKeyboard ? { reply_markup: { inline_keyboard: params.inlineKeyboard } } : {}),
    }, fetchImpl);
    if (!body.ok || !body.result) throw new Error(`Telegram sendMessage failed: ${body.description ?? 'unknown error'}`);
    return body.result;
};

export interface EditTelegramBotMessageParams {
    chatId: string | number;
    messageId: number;
    text: string;
    inlineKeyboard?: TelegramInlineKeyboard;
}

const NOT_MODIFIED_MARKER = 'message is not modified';

export const editTelegramBotMessageText = async (
    params: EditTelegramBotMessageParams,
    fetchImpl: typeof fetch = fetch,
): Promise<void> => {
    const body = await callTelegramApi<TelegramSentMessage>('editMessageText', {
        chat_id: params.chatId,
        message_id: params.messageId,
        text: params.text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...(params.inlineKeyboard ? { reply_markup: { inline_keyboard: params.inlineKeyboard } } : {}),
    }, fetchImpl);
    // Re-rendering the same step (e.g. a duplicate callback) legitimately produces identical
    // text/markup — Telegram's 400 for that case is not a real failure, just a no-op.
    if (!body.ok && !body.description?.includes(NOT_MODIFIED_MARKER)) {
        throw new Error(`Telegram editMessageText failed: ${body.description ?? 'unknown error'}`);
    }
};

export interface AnswerTelegramCallbackQueryParams {
    callbackQueryId: string;
    text?: string;
    showAlert?: boolean;
}

export const answerTelegramCallbackQuery = async (
    params: AnswerTelegramCallbackQueryParams,
    fetchImpl: typeof fetch = fetch,
): Promise<void> => {
    // Best-effort: failing to stop the tap spinner must never break the actual flow it belongs to.
    await callTelegramApi('answerCallbackQuery', {
        callback_query_id: params.callbackQueryId,
        text: params.text,
        show_alert: params.showAlert ?? false,
    }, fetchImpl).catch((): undefined => undefined);
};
