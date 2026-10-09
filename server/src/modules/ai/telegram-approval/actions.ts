import type { TelegramCallbackQuery } from '../../../integrations/telegram/bot';
import { contentStamp, parseCallbackData, type ApprovalAction, type ParsedCallback } from './callback';

export interface ApprovalDraft { id: string; status: string; content: string; conversationId: string }
export interface PressedMessage { chatId: number; messageId: number }

// Everything a button press touches; tests replace it with in-memory fakes.
export interface ApprovalDeps {
    // Telegram user id → email of the staff member who presses the buttons with it.
    approvers: ReadonlyMap<string, string>;
    findUserId(email: string): Promise<string | null>;
    loadDraft(id: string): Promise<ApprovalDraft | null>;
    approve(draft: ApprovalDraft, userId: string): Promise<void>;
    reject(draft: ApprovalDraft, userId: string): Promise<void>;
    markSpam(draft: ApprovalDraft, userId: string): Promise<void>;
    answer(callbackId: string, text: string, alert?: boolean): Promise<void>;
    // Takes the buttons off the message and says under it what was done.
    finish(message: PressedMessage, text: string): Promise<void>;
}

// A press that is turned down for a reason the person can act on; shown to them as it is.
export class Refusal extends Error {}

const OPEN_STATUSES = ['GENERATED', 'EDITED'];

const DONE: Record<ApprovalAction, string> = { approve: '✅ Ответ отправлен', reject: '❌ Черновик отклонён', spam: '🚫 Письмо помечено как спам' };

const PERFORM: Record<ApprovalAction, (deps: ApprovalDeps, draft: ApprovalDraft, userId: string) => Promise<void>> = {
    approve: (deps, draft, userId) => deps.approve(draft, userId),
    reject: (deps, draft, userId) => deps.reject(draft, userId),
    spam: (deps, draft, userId) => deps.markSpam(draft, userId),
};

const staffUserId = async (actorId: string, deps: ApprovalDeps): Promise<string> => {
    const email = deps.approvers.get(actorId);
    if (!email) throw new Refusal(`У вас нет права утверждать письма. Ваш Telegram ID: ${actorId} — его нужно добавить в TELEGRAM_APPROVERS.`);
    const userId = await deps.findUserId(email);
    if (!userId) throw new Refusal(`В CRM нет активного сотрудника с почтой ${email}.`);
    return userId;
};

const actionableDraft = async (parsed: ParsedCallback, deps: ApprovalDeps): Promise<ApprovalDraft> => {
    const draft = await deps.loadDraft(parsed.draftId);
    if (!draft || !OPEN_STATUSES.includes(draft.status)) throw new Refusal('Это письмо уже обработано.');
    if (contentStamp(draft.content) !== parsed.stamp) throw new Refusal('Черновик изменён в CRM — откройте письмо там.');
    return draft;
};

const pressedMessage = (callback: TelegramCallbackQuery): PressedMessage | null => {
    const chatId = callback.message?.chat?.id;
    const messageId = callback.message?.message_id;
    return typeof chatId === 'number' && typeof messageId === 'number' ? { chatId, messageId } : null;
};

const explain = (error: unknown): string => (error instanceof Refusal
    ? error.message
    : `⚠️ Не получилось: ${error instanceof Error ? error.message.slice(0, 120) : 'неизвестная ошибка'}`);

export type PressOutcome = ApprovalAction | 'ignored' | 'refused';

// One press of a button under an approval message: who pressed, is the draft still the one
// shown, do it, and tell the chat. A press on someone else's button is left alone.
export const handleApprovalPress = async (callback: TelegramCallbackQuery, deps: ApprovalDeps): Promise<PressOutcome> => {
    const parsed = parseCallbackData(callback.data);
    if (!parsed) return 'ignored';
    try {
        const userId = await staffUserId(String(callback.from?.id ?? ''), deps);
        const draft = await actionableDraft(parsed, deps);
        await PERFORM[parsed.action](deps, draft, userId);
        await deps.answer(callback.id, DONE[parsed.action]);
        const message = pressedMessage(callback);
        if (message) await deps.finish(message, `${DONE[parsed.action]} — ${callback.from?.first_name ?? 'сотрудник'}`);
        return parsed.action;
    } catch (error) {
        await deps.answer(callback.id, explain(error), true);
        return 'refused';
    }
};

// "123456:anna@hhdc.test, 789:inna@hhdc.test" → Telegram id → staff email.
export const parseApprovers = (value: string | undefined): Map<string, string> => new Map(
    (value ?? '').split(',').map(pair => pair.trim().split(':').map(part => part.trim().toLowerCase()))
        .filter((parts): parts is [string, string] => parts.length === 2 && /^\d+$/.test(parts[0]) && parts[1].includes('@')),
);
