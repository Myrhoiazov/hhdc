import { createHash } from 'node:crypto';

export const APPROVAL_ACTIONS = ['approve', 'reject', 'spam'] as const;
export type ApprovalAction = typeof APPROVAL_ACTIONS[number];

const CODES: Record<ApprovalAction, string> = { approve: 'a', reject: 'r', spam: 's' };
const ACTION_OF = Object.fromEntries(APPROVAL_ACTIONS.map(action => [CODES[action], action])) as Record<string, ApprovalAction>;
const PATTERN = /^hhdc:d:([0-9a-f-]{36}):([ars]):([0-9a-f]{8})$/;

// Telegram keeps the buttons of a message for ever, while the draft behind them can be edited in
// the CRM. The stamp ties a button to the text it was shown with.
export const contentStamp = (content: string): string => createHash('sha256').update(content).digest('hex').slice(0, 8);

// Telegram allows 64 bytes of callback data; this takes 54.
export const buildCallbackData = (draftId: string, action: ApprovalAction, content: string): string =>
    `hhdc:d:${draftId}:${CODES[action]}:${contentStamp(content)}`;

export interface ParsedCallback { draftId: string; action: ApprovalAction; stamp: string }

export const parseCallbackData = (value: unknown): ParsedCallback | null => {
    const match = typeof value === 'string' ? PATTERN.exec(value) : null;
    return match ? { draftId: match[1], action: ACTION_OF[match[2]], stamp: match[3] } : null;
};
