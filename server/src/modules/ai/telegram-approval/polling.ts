import { logger } from '../../../common/logger';
import { fetchUpdates, webhookUrl, type BotContext, type TelegramCallbackQuery, type TelegramUpdate } from '../../../integrations/telegram/bot';
import { handleApprovalPress } from './actions';
import { approvalChat, approvalDeps, approvalEnabled, setHearsPresses } from './request';

const RETRY_MS = 15_000;
const errorText = (error: unknown): string => (error instanceof Error ? error.message.slice(0, 200) : 'unknown error');

export interface PollDeps {
    fetch(offset?: number): Promise<TelegramUpdate[]>;
    press(callback: TelegramCallbackQuery): Promise<unknown>;
}

// Handles one batch of presses and returns the offset that acknowledges it. A press that fails
// is still acknowledged: the draft stays open in the CRM, and Telegram must not replay it for ever.
export const pollOnce = async (offset: number | undefined, deps: PollDeps): Promise<number | undefined> => {
    let next = offset;
    for (const update of await deps.fetch(offset)) {
        if (update.callback_query) {
            try { await deps.press(update.callback_query); }
            catch (error) { logger.error(`[telegram-approval] update ${update.update_id} failed: ${errorText(error)}`); }
        }
        next = update.update_id + 1;
    }
    return next;
};

const hostOf = (url: string): string => { try { return new URL(url).host; } catch { return 'another server'; } };

// A bot sends presses to one place only. When it already reports to a webhook, that webhook
// belongs to another system and is left as it is: this CRM then needs a bot of its own.
const canListen = async (bot: BotContext): Promise<boolean> => {
    const url = await webhookUrl(bot);
    if (url) logger.warn(`[telegram-approval] the bot already reports button presses to ${hostOf(url)}; approval buttons stay off until HHDC has its own bot`);
    return !url;
};

const wait = (ms: number): Promise<void> => new Promise(resolve => { setTimeout(resolve, ms).unref(); });

const listen = async (bot: BotContext, signal: { stopped: boolean }): Promise<void> => {
    if (!(await canListen(bot))) return;
    setHearsPresses(true);
    logger.info('[telegram-approval] listening for approval buttons');
    const deps: PollDeps = { fetch: offset => fetchUpdates(bot, offset), press: callback => handleApprovalPress(callback, approvalDeps(bot)) };
    let offset: number | undefined;
    while (!signal.stopped) {
        try { offset = await pollOnce(offset, deps); }
        catch (error) {
            logger.error(`[telegram-approval] polling failed, retrying: ${errorText(error)}`);
            await wait(RETRY_MS);
        }
    }
};

// Starts hearing the approval buttons; returns a function that stops it.
export const startApprovalPolling = (): (() => void) => {
    const signal = { stopped: false };
    const chat = approvalChat();
    if (chat && approvalEnabled() && process.env.TELEGRAM_APPROVAL_POLLING !== 'off') {
        void listen(chat.bot, signal).catch(error => logger.error(`[telegram-approval] could not start: ${errorText(error)}`));
    }
    return () => { signal.stopped = true; setHearsPresses(false); };
};
