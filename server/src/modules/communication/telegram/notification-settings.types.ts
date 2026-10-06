export const TELEGRAM_NOTIFICATION_KEYS = {
    MOLLIE_PAYMENT: 'MOLLIE_PAYMENT',
    LOGIN_BLOCKED: 'LOGIN_BLOCKED',
    NEW_DEVICE_AFTER_FAILURES: 'NEW_DEVICE_AFTER_FAILURES',
    ROLE_CHANGED: 'ROLE_CHANGED',
    NEW_EMAIL: 'NEW_EMAIL',
    NEW_STUDENT: 'NEW_STUDENT',
    NEW_MOLLIE_CUSTOMER: 'NEW_MOLLIE_CUSTOMER',
    STUDENT_DELETED: 'STUDENT_DELETED',
    MOLLIE_CUSTOMER_DELETED: 'MOLLIE_CUSTOMER_DELETED',
    MOLLIE_MANDATE: 'MOLLIE_MANDATE',
    MOLLIE_SUBSCRIPTION: 'MOLLIE_SUBSCRIPTION',
} as const;

export type TelegramNotificationKey = typeof TELEGRAM_NOTIFICATION_KEYS[keyof typeof TELEGRAM_NOTIFICATION_KEYS];

export type TelegramNotificationGroup = 'STUDENTS_AND_MOLLIE' | 'SECURITY' | 'EMAIL';

// GROUP_CHAT is the shared TELEGRAM_CHAT_ID group; EMAIL_PRIVATE_CHAT is the single admin's
// private chat with the bot (TELEGRAM_EMAIL_NOTIFY_CHAT_ID).
export type TelegramNotificationRecipient = 'GROUP_CHAT' | 'EMAIL_PRIVATE_CHAT';

export interface TelegramNotificationDefinition {
    key: TelegramNotificationKey;
    title: string;
    group: TelegramNotificationGroup;
    recipient: TelegramNotificationRecipient;
    // Used when no row is stored yet and when the setting cannot be read from the database.
    defaultEnabled: boolean;
}

export interface TelegramNotificationActor {
    id: number;
    email: string;
}

export interface StoredTelegramNotificationSetting {
    key: string;
    enabled: boolean;
    updatedAt: Date;
    updatedBy: TelegramNotificationActor | null;
}

export interface TelegramNotificationSettingsRepository {
    findByKey(key: TelegramNotificationKey): Promise<StoredTelegramNotificationSetting | null>;
    findAll(): Promise<StoredTelegramNotificationSetting[]>;
    upsert(input: SetTelegramNotificationInput): Promise<StoredTelegramNotificationSetting>;
}

export interface SetTelegramNotificationInput {
    key: TelegramNotificationKey;
    enabled: boolean;
    updatedById?: number;
}

export interface TelegramNotificationSettingView {
    key: TelegramNotificationKey;
    title: string;
    group: TelegramNotificationGroup;
    recipient: TelegramNotificationRecipient;
    enabled: boolean;
    // False when the env needed to reach the recipient chat is missing: the notification
    // is not sent regardless of `enabled`.
    configured: boolean;
    updatedAt: Date | null;
    updatedBy: TelegramNotificationActor | null;
}
