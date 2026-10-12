import prisma from '../../../../prisma/prisma-client';
import { logger } from '../../../common/logger';
import { answerCallback, removeButtons, sendBotMessage, type BotContext } from '../../../integrations/telegram/bot';
import { configuredNotifier } from '../../../integrations/telegram/notify';
import { applyConversationDisposition } from '../../communications/disposition';
import { crmLink } from '../../telegram-notifications/crm-link';
import { approveAndSendDraft } from '../draft-approval';
import { discardDraft } from '../draft.service';
import { parseApprovers, type ApprovalDeps } from './actions';
import { buildApprovalMessage, type ApprovalRequest } from './message';

// The chat that already receives the email notifications also receives the drafts to approve.
export const approvalChat = (): { bot: BotContext; chatId: string } | null => {
    const config = configuredNotifier();
    return config ? { bot: { token: config.token }, chatId: config.chatId } : null;
};

export const approvalEnabled = (env: NodeJS.ProcessEnv = process.env): boolean => env.AI_EMAIL_TELEGRAM_APPROVAL_ENABLED !== 'false';

// Buttons only work while this process hears the presses; until then a message goes out without them.
let hearsPresses = false;
export const setHearsPresses = (value: boolean): void => { hearsPresses = value; };

const DRAFT_FIELDS = {
    id: true, content: true, language: true, intent: true, confidence: true, contextSnapshot: true,
    conversation: { select: { subject: true, person: { select: { displayName: true } } } },
    sourceMessage: { select: { sender: true, bodyText: true, providerConnection: { select: { name: true } } } },
} as const;

export interface StoredDraft {
    id: string; content: string; language: string; intent: string; confidence: number | null; contextSnapshot: unknown;
    conversation: { subject: string; person: { displayName: string } | null };
    sourceMessage: { sender: string; bodyText: string; providerConnection: { name: string } | null };
}

interface Snapshot { needsStaffReview?: unknown; warnings?: unknown; knowledgeUsed?: unknown }

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);
const sourceUrls = (value: unknown): string[] => (Array.isArray(value) ? strings(value.map(item => (item as { sourceUrl?: unknown } | null)?.sourceUrl)) : []);

export const toApprovalRequest = (draft: StoredDraft, link: string): ApprovalRequest => {
    const snapshot = (draft.contextSnapshot ?? {}) as Snapshot;
    const name = draft.conversation.person?.displayName;
    return {
        draftId: draft.id, sender: draft.sourceMessage.sender, senderName: name && name !== draft.sourceMessage.sender ? name : null,
        mailbox: draft.sourceMessage.providerConnection?.name ?? null, subject: draft.conversation.subject,
        incoming: draft.sourceMessage.bodyText, draft: draft.content, language: draft.language, intent: draft.intent,
        confidence: draft.confidence, needsStaffReview: snapshot.needsStaffReview !== false,
        warnings: strings(snapshot.warnings), sources: sourceUrls(snapshot.knowledgeUsed), link,
    };
};

// Posts the draft to the staff chat with its buttons. Tells whether a message went out.
export const requestDraftApproval = async (draftId: string): Promise<boolean> => {
    const chat = approvalChat();
    if (!chat || !approvalEnabled()) return false;
    const draft = await prisma.aiDraft.findUnique({ where: { id: draftId }, select: DRAFT_FIELDS });
    if (!draft) return false;
    const message = buildApprovalMessage(toApprovalRequest(draft, crmLink('/email')));
    const text = hearsPresses ? message.text : `${message.text}\n\n<i>Кнопки появятся, когда у HHDC будет собственный бот. Пока утвердить можно в CRM.</i>`;
    await sendBotMessage(chat.bot, { chatId: chat.chatId, text, ...(hearsPresses ? { keyboard: message.keyboard } : {}) });
    await prisma.auditLog.create({ data: { actorUserId: null, action: 'AI_DRAFT_APPROVAL_REQUESTED', entityType: 'AiDraft', entityId: draftId } });
    return true;
};

// The draft already waits in the CRM, so a Telegram failure is only logged.
export const requestDraftApprovalSafely = async (draftId: string): Promise<boolean> => {
    try { return await requestDraftApproval(draftId); }
    catch (error) {
        logger.warn(`[telegram-approval] draft ${draftId} was not posted: ${error instanceof Error ? error.message.slice(0, 200) : 'unknown error'}`);
        return false;
    }
};

const findUserId: ApprovalDeps['findUserId'] = async email =>
    (await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, isActive: true }, select: { id: true } }))?.id ?? null;

const loadDraft: ApprovalDeps['loadDraft'] = id =>
    prisma.aiDraft.findUnique({ where: { id }, select: { id: true, status: true, content: true, conversationId: true } });

const finishIn = (bot: BotContext): ApprovalDeps['finish'] => async (message, text) => {
    await removeButtons(bot, message.chatId, message.messageId);
    await sendBotMessage(bot, { chatId: message.chatId, text, replyToMessageId: message.messageId });
};

export const approvalDeps = (bot: BotContext, env: NodeJS.ProcessEnv = process.env): ApprovalDeps => ({
    approvers: parseApprovers(env.TELEGRAM_APPROVERS),
    findUserId, loadDraft,
    approve: async (draft, userId) => { await approveAndSendDraft({ draftId: draft.id, userId }); },
    reject: async (draft, userId) => { await discardDraft(draft.id, userId); },
    markSpam: (draft, userId) => applyConversationDisposition(draft.conversationId, 'SPAM', userId),
    answer: (callbackId, text, alert) => answerCallback(bot, callbackId, text, alert),
    finish: finishIn(bot),
});
