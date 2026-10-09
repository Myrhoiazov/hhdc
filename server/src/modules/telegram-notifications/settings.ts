import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { logger } from '../../common/logger';
import { sendTelegramNotification } from '../../integrations/telegram/notify';
import { NOTIFICATION_KEYS, type NotificationDefinition, type NotificationKey, type NotificationSettingView } from './notifications.types';
import { exampleValues, fitMessage, renderTemplate, TEMPLATE_MAX, unknownPlaceholders } from './templates';

// Which messages the bot sends to Telegram and what they say. The list, the switches' defaults
// and the first texts live in code: a row is stored only once somebody changes a switch or a
// text, so a missing row and an unreadable table behave the same — the default applies.
//
// Only the message about a new order carries details of a customer: the owner asked for the
// buyer to be named there. The others carry counts, amounts and names of events.

const LINK = { name: 'link', example: 'https://crm.example.com/finance' };

export const NOTIFICATIONS = [
    { key: 'NEW_TICKET_SALES', group: 'SALES', title: 'New ticket sales', defaultEnabled: true,
        defaultTemplate: '🎟 New ticket order\n{{tickets}}\nEvent: {{event}}\nBuyer: {{name}}\nEmail: {{email}}\nCountry: {{country}}\nAmount: {{amount}} {{currency}}\n{{link}}',
        placeholders: [
            { name: 'tickets', example: '2 × Early Bird | Full Pass' }, { name: 'event', example: 'High Heels Dance Camp' }, { name: 'name', example: 'Anna Berg' },
            { name: 'email', example: 'anna@example.com' }, { name: 'country', example: 'Netherlands' }, { name: 'amount', example: '585.00' }, { name: 'currency', example: 'EUR' }, LINK,
        ] },
    { key: 'WEEZTIX_SYNC_FAILED', group: 'SALES', title: 'Weeztix sync failed', defaultEnabled: true,
        defaultTemplate: '⚠️ Weeztix sync failed\nConnection: {{connection}}\n{{reason}}\n{{link}}',
        placeholders: [{ name: 'connection', example: 'Weeztix' }, { name: 'reason', example: 'Weeztix did not return orders: HTTP 500' }, LINK] },
    { key: 'NEW_EMAIL', group: 'EMAIL', title: 'New email', defaultEnabled: true,
        defaultTemplate: '📨 New inbound email\n{{link}}', placeholders: [LINK] },
    { key: 'EMAIL_SYNC_FAILED', group: 'EMAIL', title: 'Mailbox sync failed', defaultEnabled: true,
        defaultTemplate: '⚠️ Email sync failed\nMailbox: {{mailbox}}\n{{link}}', placeholders: [{ name: 'mailbox', example: 'info@example.com' }, LINK] },
    { key: 'REFUND_REQUESTED', group: 'PEOPLE_AND_FINANCE', title: 'Refund requested', defaultEnabled: true,
        defaultTemplate: '↩️ Refund requested: {{amount}} {{currency}}\n{{link}}', placeholders: [{ name: 'amount', example: '120.00' }, { name: 'currency', example: 'EUR' }, LINK] },
    { key: 'EVENT_EXPENSE_ADDED', group: 'PEOPLE_AND_FINANCE', title: 'Event expense added', defaultEnabled: false,
        defaultTemplate: '💸 Expense added: {{category}} {{amount}} {{currency}}\nEvent: {{event}}\n{{link}}',
        placeholders: [{ name: 'category', example: 'VENUE' }, { name: 'amount', example: '900.00' }, { name: 'currency', example: 'EUR' }, { name: 'event', example: 'High Heels Dance Camp' }, LINK] },
    { key: 'CONTACT_DELETED', group: 'PEOPLE_AND_FINANCE', title: 'Contact deleted', defaultEnabled: false,
        defaultTemplate: '🗑 A contact created from an email was deleted by {{actor}}\n{{link}}', placeholders: [{ name: 'actor', example: 'Olga' }, LINK] },
] as const satisfies ReadonlyArray<NotificationDefinition>;

type Definition = NotificationDefinition;

const byKey = new Map<string, Definition>(NOTIFICATIONS.map(definition => [definition.key, definition]));
const definitionOf = (key: NotificationKey): Definition => byKey.get(key) as Definition;

export const notificationKeySchema = z.enum(NOTIFICATION_KEYS);
// A change of the switch, of the text, or of both. A text of `null` returns to the first one.
export const notificationChangeSchema = z.object({
    enabled: z.boolean().optional(), template: z.string().trim().max(TEMPLATE_MAX).nullable().optional(),
}).strict().refine(change => change.enabled !== undefined || change.template !== undefined, 'Nothing to change');

const STORED = { key: true, enabled: true, template: true, updatedAt: true, updatedBy: { select: { id: true, name: true, email: true } } } as const;
interface Stored { key: string; enabled: boolean; template: string | null; updatedAt: Date; updatedBy: { id: string; name: string; email: string } | null }

export const isTelegramConfigured = (env: NodeJS.ProcessEnv = process.env): boolean =>
    Boolean(env.TELEGRAM_TOKEN?.trim() && /^-?\d+$/.test(env.TELEGRAM_EMAIL_NOTIFY_CHAT_ID?.trim() ?? ''));

export const toSettingView = (definition: Definition, stored: Stored | undefined, configured: boolean): NotificationSettingView => ({
    key: definition.key, group: definition.group, title: definition.title, enabled: stored ? stored.enabled : definition.defaultEnabled,
    template: stored?.template ?? definition.defaultTemplate, defaultTemplate: definition.defaultTemplate, customised: Boolean(stored?.template),
    placeholders: definition.placeholders, configured, updatedAt: stored?.updatedAt ?? null, updatedBy: stored?.updatedBy ?? null,
});

export const listNotificationSettings = async (): Promise<NotificationSettingView[]> => {
    const stored = new Map((await prisma.telegramNotificationSetting.findMany({ select: STORED })).map(row => [row.key, row]));
    const configured = isTelegramConfigured();
    return NOTIFICATIONS.map(definition => toSettingView(definition, stored.get(definition.key), configured));
};

export interface Sending { enabled: boolean; template: string }

// What to send for a notification right now. Never throws: a notification must not break the
// work that causes it, so an unreadable setting behaves like its default.
export const sendingOf = async (key: NotificationKey): Promise<Sending> => {
    const definition = definitionOf(key);
    const fallback = { enabled: definition.defaultEnabled, template: definition.defaultTemplate };
    try {
        const stored = await prisma.telegramNotificationSetting.findUnique({ where: { key }, select: { enabled: true, template: true } });
        return stored ? { enabled: stored.enabled, template: stored.template ?? fallback.template } : fallback;
    } catch {
        logger.warn(`[telegram] setting ${key} could not be read, its default is used`);
        return fallback;
    }
};

// An empty text or the first text itself means "no text of our own".
export const templateToStore = (definition: Definition, template: string | null): string | null => {
    if (!template || template === definition.defaultTemplate) return null;
    const unknown = unknownPlaceholders(template, definition.placeholders);
    if (unknown.length) throw new ApiError(400, 'UNKNOWN_PLACEHOLDER', `This notification has no such values: ${unknown.map(name => `{{${name}}}`).join(', ')}`);
    return template;
};

export interface NotificationChange { key: NotificationKey; enabled?: boolean; template?: string | null; actorUserId: string }
// `before` is what the switch and the stored text were, for the audit log.
export interface NotificationChanged { setting: NotificationSettingView; switched: boolean; rewritten: boolean; before: { enabled: boolean; template: string | null } }

export const changeNotification = async (change: NotificationChange): Promise<NotificationChanged> => {
    const definition = definitionOf(change.key);
    const before = await prisma.telegramNotificationSetting.findUnique({ where: { key: change.key }, select: { enabled: true, template: true } });
    const was = { enabled: before?.enabled ?? definition.defaultEnabled, template: before?.template ?? null };
    const next = {
        enabled: change.enabled ?? was.enabled,
        template: change.template === undefined ? was.template : templateToStore(definition, change.template),
    };
    const data = { ...next, updatedById: change.actorUserId };
    const stored = await prisma.telegramNotificationSetting.upsert({ where: { key: change.key }, create: { key: change.key, ...data }, update: data, select: STORED });
    return { setting: toSettingView(definition, stored, isTelegramConfigured()), switched: was.enabled !== next.enabled, rewritten: was.template !== next.template, before: was };
};

// The message as it would look, filled with example values: sent on request, whatever the switch says.
export const sendTestNotification = async (key: NotificationKey): Promise<{ sent: boolean; text: string }> => {
    const definition = definitionOf(key);
    const text = renderTemplate((await sendingOf(key)).template, exampleValues(definition.placeholders));
    return { sent: await sendTelegramNotification(fitMessage(`🧪 Test message\n${text}`)), text };
};

export const announceSettingChange = (setting: NotificationSettingView, actorName: string): Promise<boolean> =>
    sendTelegramNotification(`🔔 Notification "${setting.title}" was switched ${setting.enabled ? 'on' : 'off'} by ${actorName}`);
