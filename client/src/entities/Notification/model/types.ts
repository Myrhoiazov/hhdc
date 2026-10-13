// Which messages the bot sends to Telegram, one switch per notification.
export const NOTIFICATION_GROUPS = ['SALES', 'EMAIL', 'PEOPLE_AND_FINANCE'] as const;

export type NotificationGroup = (typeof NOTIFICATION_GROUPS)[number];

export interface NotificationSetting {
    key: string;
    group: NotificationGroup;
    title: string;
    enabled: boolean;
    configured: boolean;
    // The text that is sent, the one it started as, whether staff changed it, and the values it can carry as {{name}}.
    template: string;
    defaultTemplate: string;
    customised: boolean;
    placeholders: { name: string; example: string }[];
    updatedAt: string | null;
    updatedBy: { id: string; name: string; email: string } | null;
}
