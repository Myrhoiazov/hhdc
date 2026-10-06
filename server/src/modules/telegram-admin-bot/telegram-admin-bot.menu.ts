import type { TelegramInlineKeyboard } from '../../common/telegram/telegram-bot-api.client';

export const ROOT_MENU_TEXT = '<b>DDC ADMIN</b>';

// Telegram rejects `web_app` inline buttons with BUTTON_TYPE_INVALID everywhere except a
// private 1:1 chat with the bot (confirmed empirically against the live Bot API 2026-09-24) —
// so a group/supergroup chat (this bot's actual admin chat, TELEGRAM_CHAT_ID, is one) gets a
// plain `url` deep link into a private chat with the bot instead, where the real menu below can
// then be sent.
export const GROUP_MENU_TEXT = 'Откройте панель администратора в личном чате с ботом:';

export const buildOpenPrivateChatKeyboard = (botUsername: string): TelegramInlineKeyboard => [
    [{ text: '📊 Открыть DDC ADMIN', url: `https://t.me/${botUsername}?start=menu` }],
];

// Single source of truth for the root menu's buttons. Each `id` must match a key in the
// `screens` map in client/telegram-mini-app/src/main.ts — that file is a separate, standalone
// esbuild bundle (spec §4.2), so the two can't share a TS import; this list is the server half
// of that contract. Adding a new Mini App screen later is: one entry here + one screen module
// on the client side, per the pattern already used for dashboard/search/new-student.
const MINI_APP_SCREENS: ReadonlyArray<{ id: string; label: string; emoji: string }> = [
    { id: 'dashboard', label: 'Dashboard', emoji: '📊' },
    { id: 'new-student', label: 'Новый ученик', emoji: '👤' },
    { id: 'search', label: 'Найти ученика', emoji: '🔎' },
];

// Every button opens the Mini App directly on its screen (`?screen=<id>`) instead of driving a
// bot-side conversational flow — the Mini App is the one real UI now (spec: Telegram Mini App
// plan, Task 11).
export const buildRootMenuKeyboard = (miniAppUrl: string): TelegramInlineKeyboard => (
    MINI_APP_SCREENS.map(({ id, label, emoji }) => [
        { text: `${emoji} ${label}`, web_app: { url: `${miniAppUrl}?screen=${id}` } },
    ])
);
