import prisma from '../../../../prisma/prisma-client';
import {
    TELEGRAM_NOTIFICATION_KEYS,
    type SetTelegramNotificationInput,
    type StoredTelegramNotificationSetting,
    type TelegramNotificationDefinition,
    type TelegramNotificationKey,
    type TelegramNotificationRecipient,
    type TelegramNotificationSettingsRepository,
    type TelegramNotificationSettingView,
} from './notification-settings.types';

// The list of notification types and their defaults lives in code: a database row exists only
// once an admin has changed a setting, so a missing row and a failed read behave the same.
export const TELEGRAM_NOTIFICATION_DEFINITIONS: readonly TelegramNotificationDefinition[] = [
    {
        key: TELEGRAM_NOTIFICATION_KEYS.NEW_STUDENT,
        title: 'Новый ученик',
        group: 'STUDENTS_AND_MOLLIE',
        recipient: 'GROUP_CHAT',
        defaultEnabled: false,
    },
    {
        key: TELEGRAM_NOTIFICATION_KEYS.STUDENT_DELETED,
        title: 'Удаление ученика',
        group: 'STUDENTS_AND_MOLLIE',
        recipient: 'GROUP_CHAT',
        defaultEnabled: false,
    },
    {
        key: TELEGRAM_NOTIFICATION_KEYS.NEW_MOLLIE_CUSTOMER,
        title: 'Новый клиент Mollie',
        group: 'STUDENTS_AND_MOLLIE',
        recipient: 'GROUP_CHAT',
        defaultEnabled: false,
    },
    {
        key: TELEGRAM_NOTIFICATION_KEYS.MOLLIE_CUSTOMER_DELETED,
        title: 'Удаление клиента Mollie',
        group: 'STUDENTS_AND_MOLLIE',
        recipient: 'GROUP_CHAT',
        defaultEnabled: false,
    },
    {
        key: TELEGRAM_NOTIFICATION_KEYS.MOLLIE_MANDATE,
        title: 'Мандаты Mollie',
        group: 'STUDENTS_AND_MOLLIE',
        recipient: 'GROUP_CHAT',
        defaultEnabled: false,
    },
    {
        key: TELEGRAM_NOTIFICATION_KEYS.MOLLIE_SUBSCRIPTION,
        title: 'Подписки Mollie',
        group: 'STUDENTS_AND_MOLLIE',
        recipient: 'GROUP_CHAT',
        defaultEnabled: false,
    },
    {
        key: TELEGRAM_NOTIFICATION_KEYS.MOLLIE_PAYMENT,
        title: 'Платежи Mollie',
        group: 'STUDENTS_AND_MOLLIE',
        recipient: 'GROUP_CHAT',
        defaultEnabled: true,
    },
    {
        key: TELEGRAM_NOTIFICATION_KEYS.LOGIN_BLOCKED,
        title: 'Блокировка входа по лимиту попыток',
        group: 'SECURITY',
        recipient: 'GROUP_CHAT',
        defaultEnabled: true,
    },
    {
        key: TELEGRAM_NOTIFICATION_KEYS.NEW_DEVICE_AFTER_FAILURES,
        title: 'Вход с нового устройства после неудачных попыток',
        group: 'SECURITY',
        recipient: 'GROUP_CHAT',
        defaultEnabled: true,
    },
    {
        key: TELEGRAM_NOTIFICATION_KEYS.ROLE_CHANGED,
        title: 'Изменение роли пользователя',
        group: 'SECURITY',
        recipient: 'GROUP_CHAT',
        defaultEnabled: true,
    },
    {
        key: TELEGRAM_NOTIFICATION_KEYS.NEW_EMAIL,
        title: 'Новое письмо',
        group: 'EMAIL',
        recipient: 'EMAIL_PRIVATE_CHAT',
        defaultEnabled: true,
    },
];

const definitionByKey = new Map(TELEGRAM_NOTIFICATION_DEFINITIONS.map((definition) => [definition.key, definition]));

export const isTelegramNotificationKey = (value: unknown): value is TelegramNotificationKey => (
    typeof value === 'string' && definitionByKey.has(value as TelegramNotificationKey)
);

export const getTelegramNotificationDefinition = (key: TelegramNotificationKey): TelegramNotificationDefinition => {
    const definition = definitionByKey.get(key);
    if (!definition) throw new Error(`Unknown Telegram notification key: ${key}`);
    return definition;
};

const recipientChatEnv: Record<TelegramNotificationRecipient, string> = {
    GROUP_CHAT: 'TELEGRAM_CHAT_ID',
    EMAIL_PRIVATE_CHAT: 'TELEGRAM_EMAIL_NOTIFY_CHAT_ID',
};

export const isTelegramRecipientConfigured = (recipient: TelegramNotificationRecipient) => Boolean(
    process.env.TELEGRAM_TOKEN && process.env[recipientChatEnv[recipient]],
);

const storedSettingSelect = {
    key: true,
    enabled: true,
    updatedAt: true,
    updatedBy: { select: { id: true, email: true } },
} as const;

const findStoredSettingByKey = (key: TelegramNotificationKey): Promise<StoredTelegramNotificationSetting | null> => (
    prisma.telegramNotificationSetting.findUnique({ where: { key }, select: storedSettingSelect })
);

const findAllStoredSettings = (): Promise<StoredTelegramNotificationSetting[]> => (
    prisma.telegramNotificationSetting.findMany({ select: storedSettingSelect })
);

const upsertStoredSetting = (
    { key, enabled, updatedById }: SetTelegramNotificationInput,
): Promise<StoredTelegramNotificationSetting> => (
    prisma.telegramNotificationSetting.upsert({
        where: { key },
        create: { key, enabled, updatedById },
        update: { enabled, updatedById },
        select: storedSettingSelect,
    })
);

export const telegramNotificationSettingsRepository: TelegramNotificationSettingsRepository = {
    findByKey: findStoredSettingByKey,
    findAll: findAllStoredSettings,
    upsert: upsertStoredSetting,
};

// Never throws: a notification must not break the request that triggers it, so an unreadable
// setting behaves like its default.
export const isTelegramNotificationEnabled = async (
    key: TelegramNotificationKey,
    repository: TelegramNotificationSettingsRepository = telegramNotificationSettingsRepository,
): Promise<boolean> => {
    const { defaultEnabled } = getTelegramNotificationDefinition(key);
    try {
        const stored = await repository.findByKey(key);
        return stored ? stored.enabled : defaultEnabled;
    } catch (error) {
        console.error(`Failed to read Telegram notification setting ${key}, using default:`, error);
        return defaultEnabled;
    }
};

const toSettingView = (
    definition: TelegramNotificationDefinition,
    stored?: StoredTelegramNotificationSetting | null,
): TelegramNotificationSettingView => ({
    key: definition.key,
    title: definition.title,
    group: definition.group,
    recipient: definition.recipient,
    enabled: stored ? stored.enabled : definition.defaultEnabled,
    configured: isTelegramRecipientConfigured(definition.recipient),
    updatedAt: stored ? stored.updatedAt : null,
    updatedBy: stored ? stored.updatedBy : null,
});

export const listTelegramNotificationSettings = async (
    repository: TelegramNotificationSettingsRepository = telegramNotificationSettingsRepository,
): Promise<TelegramNotificationSettingView[]> => {
    const storedByKey = new Map((await repository.findAll()).map((stored) => [stored.key, stored]));
    return TELEGRAM_NOTIFICATION_DEFINITIONS.map((definition) => toSettingView(definition, storedByKey.get(definition.key)));
};

export const setTelegramNotificationEnabled = async (
    input: SetTelegramNotificationInput,
    repository: TelegramNotificationSettingsRepository = telegramNotificationSettingsRepository,
): Promise<{ setting: TelegramNotificationSettingView; changed: boolean }> => {
    const definition = getTelegramNotificationDefinition(input.key);
    const previous = await repository.findByKey(input.key);
    const previousEnabled = previous ? previous.enabled : definition.defaultEnabled;
    const stored = await repository.upsert(input);

    return { setting: toSettingView(definition, stored), changed: previousEnabled !== stored.enabled };
};
