import {
    answerTelegramCallbackQuery, sendTelegramBotMessage, type TelegramInlineKeyboard,
} from '../../common/telegram/telegram-bot-api.client';
import { resolveTelegramAdmin, type ResolvedTelegramAdmin } from './telegram-admin-bot.auth';
import {
    buildOpenPrivateChatKeyboard, buildRootMenuKeyboard, GROUP_MENU_TEXT, ROOT_MENU_TEXT,
} from './telegram-admin-bot.menu';

export interface TelegramAdminBotUpdate {
    message?: {
        text?: unknown;
        from?: { id?: unknown };
        chat?: { id?: unknown; type?: unknown };
    };
    callback_query?: {
        id?: unknown;
        from?: { id?: unknown };
        message?: { chat?: { id?: unknown } };
    };
}

export interface TelegramAdminBotDeps {
    resolveAdmin: (telegramUserId: string) => Promise<ResolvedTelegramAdmin | null>;
    send: typeof sendTelegramBotMessage;
    answerCallback: typeof answerTelegramCallbackQuery;
}

const defaultDeps: TelegramAdminBotDeps = {
    resolveAdmin: resolveTelegramAdmin,
    send: sendTelegramBotMessage,
    answerCallback: answerTelegramCallbackQuery,
};

interface Render { text: string; keyboard?: TelegramInlineKeyboard }

// Every root-menu button is now a `web_app` button (see telegram-admin-bot.menu.ts) that opens
// the Mini App directly — nothing sends `callback_data` for this bot anymore, so there is no
// conversational flow state to hold. Both env vars below are read directly (not injected via
// deps), matching how telegram-bot-api.client.ts reads TELEGRAM_TOKEN.
const resolveMiniAppUrl = (): string | undefined => process.env.TELEGRAM_MINIAPP_URL?.trim() || undefined;
const resolveBotUsername = (): string | undefined => process.env.TELEGRAM_BOT_USERNAME?.trim() || undefined;

const renderRootMenu = (miniAppUrl: string): Render => ({ text: ROOT_MENU_TEXT, keyboard: buildRootMenuKeyboard(miniAppUrl) });

const resolveChatId = (update: TelegramAdminBotUpdate): string | number => (
    update.callback_query?.message?.chat?.id as string | number | undefined
    ?? update.message?.chat?.id as string | number | undefined
    ?? process.env.TELEGRAM_CHAT_ID
    ?? ''
);

// Unauthorized: no CRM/customer data of any kind goes out, not even an error detail beyond
// "no access" (spec §5.2).
const respondUnauthorized = async (update: TelegramAdminBotUpdate, chatId: string | number, deps: TelegramAdminBotDeps): Promise<void> => {
    const callbackId = update.callback_query?.id;
    if (typeof callbackId === 'string') {
        await deps.answerCallback({ callbackQueryId: callbackId, text: '⛔ Недостаточно прав', showAlert: true });
    } else if (chatId) {
        await deps.send({ chatId, text: '⛔ У вас нет доступа к этому боту.' });
    }
};

// web_app buttons are only valid in a private 1:1 chat with the bot — Telegram rejects them
// with BUTTON_TYPE_INVALID anywhere else (confirmed against the live Bot API 2026-09-24), and
// this bot's actual admin chat is a supergroup. So a group/supergroup gets a plain `url` deep
// link into a private chat instead, where /start?start=menu lands back here with
// chat.type === 'private' and gets the real menu.
const handleStartCommand = async (update: TelegramAdminBotUpdate, chatId: string | number, deps: TelegramAdminBotDeps): Promise<void> => {
    if (update.message?.chat?.type !== 'private') {
        const botUsername = resolveBotUsername();
        if (!botUsername) {
            await deps.send({ chatId, text: '⚠️ Бот не настроен (TELEGRAM_BOT_USERNAME).' });
            return;
        }
        await deps.send({ chatId, text: GROUP_MENU_TEXT, inlineKeyboard: buildOpenPrivateChatKeyboard(botUsername) });
        return;
    }

    const miniAppUrl = resolveMiniAppUrl();
    if (!miniAppUrl) {
        await deps.send({ chatId, text: '⚠️ Mini App не настроен (TELEGRAM_MINIAPP_URL).' });
        return;
    }
    const render = renderRootMenu(miniAppUrl);
    await deps.send({ chatId, text: render.text, inlineKeyboard: render.keyboard });
};

// The transport-agnostic core, mirroring ai-email-assistant/telegram-approval.controller.ts's
// handleTelegramApprovalUpdate: kept free of Express types so both the webhook controller and
// the polling service (server/src/common/telegram/telegram-update-dispatcher.ts) share one path.
export const handleTelegramAdminBotUpdate = async (
    update: TelegramAdminBotUpdate,
    deps: TelegramAdminBotDeps = defaultDeps,
): Promise<{ status: number; body: unknown }> => {
    const fromIdValue = update.callback_query?.from?.id ?? update.message?.from?.id;
    if (fromIdValue === undefined) return { status: 200, body: { ok: true } };
    const telegramUserId = String(fromIdValue);
    const chatId = resolveChatId(update);

    const admin = await deps.resolveAdmin(telegramUserId);
    if (!admin) {
        await respondUnauthorized(update, chatId, deps);
        return { status: 200, body: { ok: true } };
    }

    // No button this bot sends carries callback_data anymore, so any callback_query that still
    // arrives (e.g. a tap on a menu message sent before this rollout) has no action to run —
    // just dismiss its loading spinner.
    const callbackId = update.callback_query?.id;
    if (typeof callbackId === 'string') {
        await deps.answerCallback({ callbackQueryId: callbackId });
        return { status: 200, body: { ok: true } };
    }

    const text = typeof update.message?.text === 'string' ? update.message.text : '';
    if (/^\/start(\s|$)/.test(text.trim())) {
        await handleStartCommand(update, chatId, deps);
    }

    return { status: 200, body: { ok: true } };
};
