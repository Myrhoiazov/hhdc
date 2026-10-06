import type { Request } from 'express';
import { createPrismaDraftApprovalRepository } from './draft.persistence';
import { applyDraftAction, parseAllowedTelegramActors, type DraftAction } from './approval.service';
import { sendTelegramMessage } from '../communication/telegram/telegram.service';

const callbackPattern = /^ai:draft:(\d+):(\d+):(approve|edit|reject|spam)$/;

export const buildDraftCallbackData = (draftId: number, version: number, action: DraftAction['action']) =>
    `ai:draft:${draftId}:${version}:${action}`;

export const parseDraftCallbackData = (value: unknown): Omit<DraftAction, 'actorId' | 'editedBody'> | null => {
    if (typeof value !== 'string') return null;
    const match = callbackPattern.exec(value);
    if (!match) return null;
    const draftId = Number(match[1]);
    const draftVersion = Number(match[2]);
    if (!Number.isSafeInteger(draftId) || draftId < 1 || !Number.isSafeInteger(draftVersion) || draftVersion < 1) return null;
    return {
        draftId,
        draftVersion,
        action: match[3] as DraftAction['action'],
    };
};

export const parseDraftEditCommand = (value: unknown): Omit<DraftAction, 'actorId'> | null => {
    if (typeof value !== 'string') return null;
    const match = /^\/edit\s+(\d+)\s+(\d+)\s+([\s\S]+)$/.exec(value.trim());
    if (!match) return null;
    const draftId = Number(match[1]);
    const draftVersion = Number(match[2]);
    const editedBody = match[3].trim();
    if (!Number.isSafeInteger(draftId) || draftId < 1 || !Number.isSafeInteger(draftVersion) || draftVersion < 1 || !editedBody) return null;
    return { draftId, draftVersion, action: 'edit', editedBody };
};

const configuredSecret = () => process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? '';

export interface TelegramApprovalUpdate {
    callback_query?: { data?: unknown; from?: { id?: unknown } };
    message?: { text?: unknown; from?: { id?: unknown } };
}

type ParsedDraftAction = Omit<DraftAction, 'actorId'>;

// Responding to a Telegram webhook update with an arbitrary JSON body is not the same as
// sending a chat message — Telegram does not render it, so the operator saw nothing after
// tapping "Edit" (found live in this session). The actual instruction has to go out through the
// Bot API like any other message.
const handleTelegramEditAction = async (actorId: string, parsed: ParsedDraftAction): Promise<{ status: number; body: unknown }> => {
    if (!parseAllowedTelegramActors(process.env.TELEGRAM_APPROVER_IDS).has(actorId)) {
        return { status: 403, body: { message: 'Telegram actor is not authorized' } };
    }
    await sendTelegramMessage(
        `Чтобы отредактировать черновик <code>${parsed.draftId}:${parsed.draftVersion}</code>, отправьте одним сообщением:\n`
        + `<code>/edit ${parsed.draftId} ${parsed.draftVersion} ваш новый текст</code>`,
    );
    return { status: 200, body: { ok: true, requiresEdit: true } };
};

// Same fix as handleTelegramEditAction, for the other three buttons: the webhook response body
// is invisible to the operator, so a successful tap looked identical to a dropped one.
const applyAndConfirmDraftAction = async (parsed: ParsedDraftAction, actorId: string): Promise<{ status: number; body: unknown }> => {
    const result = await applyDraftAction(
        { ...parsed, actorId },
        createPrismaDraftApprovalRepository(),
        parseAllowedTelegramActors(process.env.TELEGRAM_APPROVER_IDS),
    );
    const confirmation = {
        APPROVED: '✅ Черновик одобрен', REJECTED: '❌ Черновик отклонён', SPAM: '🚫 Письмо помечено как спам',
    }[result.status];
    if (confirmation) {
        await sendTelegramMessage(`${confirmation} (<code>${parsed.draftId}:${parsed.draftVersion}</code>)`);
    }
    return { status: 200, body: { ok: true, status: result.status } };
};

type ResolvedApprovalRequest =
    | { parsed: ParsedDraftAction; actorId: string; isCallback: boolean }
    | { earlyResponse: { status: number; body: unknown } };

const resolveTelegramApprovalRequest = (update: TelegramApprovalUpdate): ResolvedApprovalRequest => {
    const callback = update.callback_query;
    const message = update.message;
    if (!callback && !message) return { earlyResponse: { status: 200, body: { ok: true } } };

    const parsed = callback ? parseDraftCallbackData(callback.data) : parseDraftEditCommand(message?.text);
    const actorIdValue = callback?.from?.id ?? message?.from?.id;
    const actorId = actorIdValue === undefined ? '' : String(actorIdValue);
    if (!parsed || !actorId) {
        if (message && !callback) return { earlyResponse: { status: 200, body: { ok: true } } };
        return { earlyResponse: { status: 400, body: { message: 'Invalid Telegram callback payload' } } };
    }
    return { parsed, actorId, isCallback: Boolean(callback) };
};

// The transport-agnostic core: given one Telegram update (however it arrived — a pushed webhook
// request or a pulled getUpdates result), apply the approval action and return a plain
// {status, body} result. Kept free of Express types so telegram-approval.polling.service.ts can
// reuse the exact same logic instead of drifting a second copy of it.
export const handleTelegramApprovalUpdate = async (update: TelegramApprovalUpdate): Promise<{ status: number; body: unknown }> => {
    const resolved = resolveTelegramApprovalRequest(update);
    if ('earlyResponse' in resolved) return resolved.earlyResponse;
    const { parsed, actorId, isCallback } = resolved;

    try {
        if (isCallback && parsed.action === 'edit') return await handleTelegramEditAction(actorId, parsed);
        return await applyAndConfirmDraftAction(parsed, actorId);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const status = message.includes('not authorized') ? 403 : message.includes('not found') ? 404 : 409;
        return { status, body: { message } };
    }
};

export const telegramWebhookSecretIsValid = (req: Request): boolean => {
    const secret = configuredSecret();
    return Boolean(secret) && req.header('x-telegram-bot-api-secret-token') === secret;
};
