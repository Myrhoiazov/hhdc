// The contract of Telegram notifications for the modules that announce something: which
// notifications exist and how one is announced. How switches and texts are stored is not part of it.

export const NOTIFICATION_KEYS = ['NEW_TICKET_SALES', 'WEEZTIX_SYNC_FAILED', 'NEW_EMAIL', 'EMAIL_SYNC_FAILED', 'REFUND_REQUESTED', 'EVENT_EXPENSE_ADDED', 'CONTACT_DELETED'] as const;
export type NotificationKey = typeof NOTIFICATION_KEYS[number];

export const NOTIFICATION_GROUPS = ['SALES', 'EMAIL', 'PEOPLE_AND_FINANCE'] as const;
export type NotificationGroup = typeof NOTIFICATION_GROUPS[number];

// A value the message can carry, written in its text as {{name}}; the example fills previews and test messages.
export interface NotificationPlaceholder { name: string; example: string }

export interface NotificationDefinition {
    key: NotificationKey; group: NotificationGroup; title: string; defaultEnabled: boolean;
    defaultTemplate: string; placeholders: readonly NotificationPlaceholder[];
}

export interface NotificationSettingView {
    key: NotificationKey; group: NotificationGroup; title: string; enabled: boolean;
    // The text that is sent, the one it started as, and whether staff changed it.
    template: string; defaultTemplate: string; customised: boolean; placeholders: readonly NotificationPlaceholder[];
    // False while the bot token or the chat is missing: nothing is sent whatever the switch says.
    configured: boolean; updatedAt: Date | null; updatedBy: { id: string; name: string; email: string } | null;
}

export type NotificationValues = Record<string, string | number>;

// Sends the message of the notification, filled with `values`, when its switch is on.
// Never throws and tells whether a message went out.
export type Announce = (key: NotificationKey, values: NotificationValues) => Promise<boolean>;
