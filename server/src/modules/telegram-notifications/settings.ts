import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { logger } from '../../common/logger';
import { sendTelegramNotification } from '../../integrations/telegram/notify';
import { NOTIFICATION_KEYS, type NotificationDefinition, type NotificationKey, type NotificationSettingView } from './notifications.types';

// Which messages the bot sends to Telegram. The list and its defaults live in code: a row is
// stored only once somebody changes a switch, so a missing row and an unreadable table behave
// the same — the default applies.

export const NOTIFICATIONS = [
    { key: 'NEW_TICKET_SALES', group: 'SALES', title: 'New ticket sales', defaultEnabled: true },
    { key: 'WEEZTIX_SYNC_FAILED', group: 'SALES', title: 'Weeztix sync failed', defaultEnabled: true },
    { key: 'NEW_EMAIL', group: 'EMAIL', title: 'New email', defaultEnabled: true },
    { key: 'EMAIL_SYNC_FAILED', group: 'EMAIL', title: 'Mailbox sync failed', defaultEnabled: true },
    { key: 'REFUND_REQUESTED', group: 'PEOPLE_AND_FINANCE', title: 'Refund requested', defaultEnabled: true },
    { key: 'EVENT_EXPENSE_ADDED', group: 'PEOPLE_AND_FINANCE', title: 'Event expense added', defaultEnabled: false },
    { key: 'CONTACT_DELETED', group: 'PEOPLE_AND_FINANCE', title: 'Contact deleted', defaultEnabled: false },
] as const satisfies ReadonlyArray<NotificationDefinition>;

type Definition = NotificationDefinition;

const byKey = new Map<string, Definition>(NOTIFICATIONS.map(definition => [definition.key, definition]));
export const notificationKeySchema = z.enum(NOTIFICATION_KEYS);
export const notificationChangeSchema = z.object({ enabled: z.boolean() }).strict();

const STORED = { key: true, enabled: true, updatedAt: true, updatedBy: { select: { id: true, name: true, email: true } } } as const;
interface Stored { key: string; enabled: boolean; updatedAt: Date; updatedBy: { id: string; name: string; email: string } | null }

export const isTelegramConfigured = (env: NodeJS.ProcessEnv = process.env): boolean =>
    Boolean(env.TELEGRAM_TOKEN?.trim() && /^-?\d+$/.test(env.TELEGRAM_EMAIL_NOTIFY_CHAT_ID?.trim() ?? ''));

export const toSettingView = (definition: Definition, stored: Stored | undefined, configured: boolean): NotificationSettingView => ({
    key: definition.key, group: definition.group, title: definition.title, enabled: stored ? stored.enabled : definition.defaultEnabled,
    configured, updatedAt: stored?.updatedAt ?? null, updatedBy: stored?.updatedBy ?? null,
});

export const listNotificationSettings = async (): Promise<NotificationSettingView[]> => {
    const stored = new Map((await prisma.telegramNotificationSetting.findMany({ select: STORED })).map(row => [row.key, row]));
    const configured = isTelegramConfigured();
    return NOTIFICATIONS.map(definition => toSettingView(definition, stored.get(definition.key), configured));
};

// Never throws: a notification must not break the work that causes it.
export const isNotificationEnabled = async (key: NotificationKey): Promise<boolean> => {
    const fallback = byKey.get(key)?.defaultEnabled ?? false;
    try {
        const stored = await prisma.telegramNotificationSetting.findUnique({ where: { key }, select: { enabled: true } });
        return stored ? stored.enabled : fallback;
    } catch {
        logger.warn(`[telegram] setting ${key} could not be read, its default is used`);
        return fallback;
    }
};

export interface NotificationChange { key: NotificationKey; enabled: boolean; actorUserId: string }

export const setNotificationEnabled = async (change: NotificationChange): Promise<{ setting: NotificationSettingView; changed: boolean }> => {
    const definition = byKey.get(change.key)!;
    const before = await isNotificationEnabled(change.key);
    const data = { enabled: change.enabled, updatedById: change.actorUserId };
    const stored = await prisma.telegramNotificationSetting.upsert({ where: { key: change.key }, create: { key: change.key, ...data }, update: data, select: STORED });
    return { setting: toSettingView(definition, stored, isTelegramConfigured()), changed: before !== stored.enabled };
};

export const announceSettingChange = (setting: NotificationSettingView, actorName: string): Promise<boolean> =>
    sendTelegramNotification(`🔔 Notification "${setting.title}" was switched ${setting.enabled ? 'on' : 'off'} by ${actorName}`);
