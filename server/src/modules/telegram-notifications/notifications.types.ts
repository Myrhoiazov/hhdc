// The contract of Telegram notifications for the modules that announce something: which
// notifications exist and how one is announced. How switches are stored is not part of it.

export const NOTIFICATION_KEYS = ['NEW_TICKET_SALES', 'WEEZTIX_SYNC_FAILED', 'NEW_EMAIL', 'EMAIL_SYNC_FAILED', 'REFUND_REQUESTED', 'EVENT_EXPENSE_ADDED', 'CONTACT_DELETED'] as const;
export type NotificationKey = typeof NOTIFICATION_KEYS[number];

export const NOTIFICATION_GROUPS = ['SALES', 'EMAIL', 'PEOPLE_AND_FINANCE'] as const;
export type NotificationGroup = typeof NOTIFICATION_GROUPS[number];

export interface NotificationDefinition { key: NotificationKey; group: NotificationGroup; title: string; defaultEnabled: boolean }

export interface NotificationSettingView {
    key: NotificationKey; group: NotificationGroup; title: string; enabled: boolean;
    // False while the bot token or the chat is missing: nothing is sent whatever the switch says.
    configured: boolean; updatedAt: Date | null; updatedBy: { id: string; name: string; email: string } | null;
}

// Sends the message when the switch of the notification is on: a ready text, or a sender that
// builds its own. Never throws and tells whether a message went out.
export type Announce = (key: NotificationKey, message: string | (() => Promise<boolean>)) => Promise<boolean>;
