import { handleTelegramApprovalUpdate } from '../../modules/ai-email-assistant/telegram-approval.controller';
import { handleTelegramAdminBotUpdate } from '../../modules/telegram-admin-bot/telegram-admin-bot.service';

// Both bot features share one physical Telegram bot (one TELEGRAM_TOKEN, one webhook route,
// POST /api/v1/telegram/webhook) rather than registering a second bot in BotFather — this is the
// single place that decides which feature owns a given update. A standalone superset (rather
// than `extends` both handlers' own update types) since their `callback_query` shapes overlap
// but aren't identical.
export interface TelegramUpdate {
    message?: {
        message_id?: unknown;
        text?: unknown;
        from?: { id?: unknown };
        chat?: { id?: unknown };
    };
    callback_query?: {
        id?: unknown;
        data?: unknown;
        from?: { id?: unknown };
        message?: { message_id?: unknown; chat?: { id?: unknown } };
    };
}

const EMAIL_DRAFT_CALLBACK_PREFIX = 'ai:draft:';
const EDIT_DRAFT_COMMAND_PATTERN = /^\/edit\s+\d+\s+\d+\s+/;
const START_COMMAND_PATTERN = /^\/start(\s|$)/;

export const dispatchTelegramUpdate = async (update: TelegramUpdate): Promise<{ status: number; body: unknown }> => {
    const callbackData = update.callback_query?.data;
    if (typeof callbackData === 'string') {
        return callbackData.startsWith(EMAIL_DRAFT_CALLBACK_PREFIX)
            ? handleTelegramApprovalUpdate(update)
            : handleTelegramAdminBotUpdate(update);
    }

    const text = update.message?.text;
    if (typeof text === 'string') {
        const trimmed = text.trim();
        if (EDIT_DRAFT_COMMAND_PATTERN.test(trimmed)) return handleTelegramApprovalUpdate(update);

        // The admin bot no longer runs conversational flows (every menu button opens the Mini
        // App directly) so /start is the only text command it still owns.
        if (START_COMMAND_PATTERN.test(trimmed)) return handleTelegramAdminBotUpdate(update);
    }

    // Anything else (unrelated text, no from id, etc.) — safe no-op, same as either handler's
    // own fallback for content it doesn't recognize.
    return { status: 200, body: { ok: true } };
};
