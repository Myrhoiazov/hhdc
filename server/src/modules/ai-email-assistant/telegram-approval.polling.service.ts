import { logger } from '../../common/logger';
import { dispatchTelegramUpdate, type TelegramUpdate as DispatchableTelegramUpdate } from '../../common/telegram/telegram-update-dispatcher';

interface TelegramUpdate extends DispatchableTelegramUpdate {
    update_id: number;
}

interface GetUpdatesResponse {
    ok: boolean;
    result?: TelegramUpdate[];
    description?: string;
}

// A local-dev alternative to the production webhook (POST /api/v1/telegram/webhook): getUpdates
// is an outbound call WE make to Telegram, so it needs no publicly reachable URL/tunnel — unlike
// a webhook, which Telegram must be able to reach over HTTPS. Telegram refuses getUpdates while a
// webhook is registered, so this is strictly one-or-the-other, never both at once.
export const fetchTelegramUpdates = async (
    token: string,
    offset: number | undefined,
    fetchImpl: typeof fetch = fetch,
): Promise<TelegramUpdate[]> => {
    const url = new URL(`https://api.telegram.org/bot${token}/getUpdates`);
    url.searchParams.set('timeout', '25'); // long poll: one request covers up to 25s of quiet, not one request per second
    url.searchParams.set('allowed_updates', JSON.stringify(['message', 'callback_query']));
    if (offset !== undefined) url.searchParams.set('offset', String(offset));

    const response = await fetchImpl(url.toString());
    if (!response.ok) throw new Error(`Telegram getUpdates failed with HTTP ${response.status}`);
    const body = await response.json() as GetUpdatesResponse;
    if (!body.ok) throw new Error(`Telegram getUpdates returned ok:false (${body.description ?? 'no description'})`);
    return body.result ?? [];
};

// Processes one batch and returns the offset to pass on the next call. Not persisted across
// process restarts (in-memory only) — acceptable for this opt-in local-dev feature: a restart
// before an update is acknowledged just re-delivers it once, and applyDraftAction already rejects
// re-applying an action to a draft that already left the GENERATED/EDITED state, so a duplicate
// delivery fails closed rather than double-acting.
export const pollTelegramApprovalUpdatesOnce = async (
    token: string,
    offset: number | undefined,
    fetchImpl: typeof fetch = fetch,
): Promise<number | undefined> => {
    const updates = await fetchTelegramUpdates(token, offset, fetchImpl);
    let nextOffset = offset;
    for (const update of updates) {
        try {
            await dispatchTelegramUpdate(update);
        } catch (error) {
            logger.error(`[TelegramPolling] Failed to process update ${update.update_id}: ${error instanceof Error ? error.message : String(error)}`);
        }
        nextOffset = update.update_id + 1;
    }
    return nextOffset;
};

export const startTelegramApprovalPolling = (): boolean => {
    if (process.env.TELEGRAM_POLLING_ENABLED !== 'true') return false;
    const token = process.env.TELEGRAM_TOKEN?.trim();
    if (!token) return false;

    let offset: number | undefined;
    const loop = async (): Promise<void> => {
        for (;;) {
            try {
                offset = await pollTelegramApprovalUpdatesOnce(token, offset);
            } catch (error) {
                logger.error(`[TelegramPolling] poll failed, retrying in 5s: ${error instanceof Error ? error.message : String(error)}`);
                await new Promise((resolve) => { setTimeout(resolve, 5_000); });
            }
        }
    };
    void loop();
    logger.info('[TelegramPolling] started (local-dev alternative to the webhook)');
    return true;
};
