import axios from 'axios';
import {
    getTelegramNotificationDefinition,
    isTelegramNotificationEnabled,
    isTelegramRecipientConfigured,
} from './notification-settings.service';
import { TELEGRAM_NOTIFICATION_KEYS, type TelegramNotificationKey } from './notification-settings.types';

type MoneyValue = string | number | { toString(): string };

interface MolliePaymentNotification {
    mollieId: string;
    status: string;
    amountValue: MoneyValue;
    amountCurrency: string;
    refundedAmount: MoneyValue;
    chargedBackAmount: MoneyValue;
    description?: string | null;
    method?: string | null;
    paidAt?: Date | null;
    consumerName?: string | null;
    customer?: {
        payerName?: string | null;
        givenName?: string | null;
        familyName?: string | null;
        email?: string | null;
        client?: {
            firstName?: string | null;
            lastName?: string | null;
            email?: string | null;
        } | null;
        clientLinks?: Array<{
            client?: {
                firstName?: string | null;
                lastName?: string | null;
                email?: string | null;
            } | null;
        }>;
    } | null;
    invoice?: {
        number: string;
        billToName?: string | null;
    } | null;
}

export const escapeHtml = (value: unknown) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const money = (value: MoneyValue, currency: string) => new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency,
}).format(Number(value));

const payerName = (payment: MolliePaymentNotification) => (
    payment.consumerName
    || payment.customer?.payerName
    || [payment.customer?.givenName, payment.customer?.familyName].filter(Boolean).join(' ')
    || payment.customer?.email
    || 'Неизвестный плательщик'
);

const clientName = (client?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
} | null) => (
    [client?.firstName, client?.lastName].filter(Boolean).join(' ')
    || client?.email
    || null
);

const studentNames = (payment: MolliePaymentNotification) => {
    const names = [
        payment.invoice?.billToName,
        clientName(payment.customer?.client),
        ...(payment.customer?.clientLinks?.map((link) => clientName(link.client)) ?? []),
    ].filter((value): value is string => Boolean(value));

    return Array.from(new Set(names)).join(', ') || null;
};

const statusLabel: Record<string, string> = {
    paid: 'Оплачен',
    failed: 'Ошибка',
    canceled: 'Отменён',
    cancelled: 'Отменён',
    expired: 'Истёк',
    charged_back: 'Chargeback',
    chargeback: 'Chargeback',
    pending: 'Ожидает',
    open: 'Открыт',
};

const notificationTitle = (payment: MolliePaymentNotification) => {
    if (Number(payment.chargedBackAmount) > 0 || payment.status === 'charged_back') return 'Chargeback по платежу';
    if (Number(payment.refundedAmount) > 0) return 'Возврат по платежу';
    if (payment.status === 'paid') return 'Успешная оплата';
    if (payment.status === 'failed') return 'Платёж завершился ошибкой';
    if (payment.status === 'canceled' || payment.status === 'cancelled') return 'Платёж отменён';
    if (payment.status === 'expired') return 'Срок платежа истёк';
    return null;
};

export const isTelegramConfigured = () => isTelegramRecipientConfigured('GROUP_CHAT');

// A notification goes out only when its recipient chat is configured and an admin has not
// switched it off (see notification-settings.service.ts for defaults).
export const canSendNotification = async (key: TelegramNotificationKey) => (
    isTelegramRecipientConfigured(getTelegramNotificationDefinition(key).recipient)
    && await isTelegramNotificationEnabled(key)
);

export const buildMolliePaymentNotification = (payment: MolliePaymentNotification) => {
    const title = notificationTitle(payment);
    if (!title) return null;
    const students = studentNames(payment);

    const rows = [
        `<b>${escapeHtml(title)}</b>`,
        '',
        `<b>Кто оплатил:</b> ${escapeHtml(payerName(payment))}`,
        students ? `<b>За кого:</b> ${escapeHtml(students)}` : null,
        `<b>Сумма:</b> ${escapeHtml(money(payment.amountValue, payment.amountCurrency))}`,
        `<b>Статус:</b> ${escapeHtml(statusLabel[payment.status] ?? payment.status)}`,
        '',
        payment.customer?.email ? `<b>Email:</b> ${escapeHtml(payment.customer.email)}` : null,
        payment.description ? `<b>Описание:</b> ${escapeHtml(payment.description)}` : null,
        payment.invoice?.number ? `<b>Инвойс:</b> ${escapeHtml(payment.invoice.number)}` : null,
        `<b>Mollie:</b> <code>${escapeHtml(payment.mollieId)}</code>`,
        payment.method ? `<b>Метод:</b> ${escapeHtml(payment.method)}` : null,
        payment.paidAt ? `<b>Оплачено:</b> ${escapeHtml(payment.paidAt.toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' }))}` : null,
        Number(payment.refundedAmount) > 0
            ? `<b>Возвращено:</b> ${escapeHtml(money(payment.refundedAmount, payment.amountCurrency))}`
            : null,
        Number(payment.chargedBackAmount) > 0
            ? `<b>Chargeback:</b> ${escapeHtml(money(payment.chargedBackAmount, payment.amountCurrency))}`
            : null,
    ].filter(Boolean);

    return rows.join('\n');
};

export interface TelegramMessageOptions {
    inlineKeyboard?: Array<Array<{ text: string; callback_data: string }>>;
    // Overrides the default TELEGRAM_CHAT_ID recipient — e.g. notifyNewEmail sends to a
    // specific admin's private chat (TELEGRAM_EMAIL_NOTIFY_CHAT_ID) instead of the shared group.
    chatId?: string;
}

export const sendTelegramMessage = async (text: string, options: TelegramMessageOptions = {}) => {
    const token = process.env.TELEGRAM_TOKEN;
    const chatId = options.chatId ?? process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
        throw new Error('Telegram is not configured. Set TELEGRAM_TOKEN and TELEGRAM_CHAT_ID.');
    }

    await axios.post(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            ...(options.inlineKeyboard ? { reply_markup: { inline_keyboard: options.inlineKeyboard } } : {}),
        },
        { timeout: 8_000 },
    );
};

export const notifyMolliePayment = async (payment: MolliePaymentNotification) => {
    const message = buildMolliePaymentNotification(payment);
    if (!message || !(await canSendNotification(TELEGRAM_NOTIFICATION_KEYS.MOLLIE_PAYMENT))) return false;
    await sendTelegramMessage(message);
    return true;
};

export const buildLoginBlockedNotification = (params: {
    email: string;
    ip?: string | null;
    retryAfterSeconds: number;
}) => [
    '<b>Вход заблокирован по лимиту попыток</b>',
    '',
    `<b>Email:</b> ${escapeHtml(params.email)}`,
    params.ip ? `<b>IP:</b> ${escapeHtml(params.ip)}` : null,
    `<b>Повтор через:</b> ${params.retryAfterSeconds} сек`,
].filter((row): row is string => Boolean(row)).join('\n');

export const buildNewDeviceAfterFailuresNotification = (params: {
    email: string;
    ip?: string | null;
    recentFailures: number;
}) => [
    '<b>Вход с нового устройства после неудачных попыток</b>',
    '',
    `<b>Email:</b> ${escapeHtml(params.email)}`,
    params.ip ? `<b>IP:</b> ${escapeHtml(params.ip)}` : null,
    `<b>Недавних неудачных попыток:</b> ${params.recentFailures}`,
].filter((row): row is string => Boolean(row)).join('\n');

// Fire-and-forget notifications for auth events — never let a Telegram send
// failure or missing config affect the actual login/block response, same
// guard pattern as notifyMolliePayment.
export const notifyLoginBlocked = async (params: {
    email: string;
    ip?: string | null;
    retryAfterSeconds: number;
}) => {
    if (!(await canSendNotification(TELEGRAM_NOTIFICATION_KEYS.LOGIN_BLOCKED))) return false;
    await sendTelegramMessage(buildLoginBlockedNotification(params));
    return true;
};

export const notifyNewDeviceAfterFailures = async (params: {
    email: string;
    ip?: string | null;
    recentFailures: number;
}) => {
    if (!(await canSendNotification(TELEGRAM_NOTIFICATION_KEYS.NEW_DEVICE_AFTER_FAILURES))) return false;
    await sendTelegramMessage(buildNewDeviceAfterFailuresNotification(params));
    return true;
};

export const buildRoleChangedNotification = (params: {
    targetEmail: string;
    actorEmail?: string | null;
    fromRole: string;
    toRole: string;
}) => [
    '<b>Изменена роль пользователя</b>',
    '',
    `<b>Пользователь:</b> ${escapeHtml(params.targetEmail)}`,
    `<b>Роль:</b> ${escapeHtml(params.fromRole)} → ${escapeHtml(params.toRole)}`,
    params.actorEmail ? `<b>Изменил:</b> ${escapeHtml(params.actorEmail)}` : null,
].filter((row): row is string => Boolean(row)).join('\n');

export const notifyRoleChanged = async (params: {
    targetEmail: string;
    actorEmail?: string | null;
    fromRole: string;
    toRole: string;
}) => {
    if (!(await canSendNotification(TELEGRAM_NOTIFICATION_KEYS.ROLE_CHANGED))) return false;
    await sendTelegramMessage(buildRoleChangedNotification(params));
    return true;
};

// Personal, not the shared group — a specific admin's own private chat with the bot
// (TELEGRAM_EMAIL_NOTIFY_CHAT_ID), separate from TELEGRAM_CHAT_ID used by every other
// notify*() in this file.
const buildNewEmailNotification = (params: {
    fromAddress: string;
    fromName?: string | null;
    replyToAddress?: string | null;
    subject?: string | null;
    accountLabel: string;
}) => [
    '<b>Новое письмо</b>',
    '',
    `<b>От:</b> ${escapeHtml(params.fromName ? `${params.fromName} <${params.fromAddress}>` : params.fromAddress)}`,
    params.replyToAddress ? `<b>Ответ на:</b> ${escapeHtml(params.replyToAddress)}` : null,
    `<b>Тема:</b> ${escapeHtml(params.subject || '(без темы)')}`,
    `<b>Ящик:</b> ${escapeHtml(params.accountLabel)}`,
].filter((row): row is string => row !== null).join('\n');

export const notifyNewEmail = async (params: {
    fromAddress: string;
    fromName?: string | null;
    replyToAddress?: string | null;
    subject?: string | null;
    accountLabel: string;
}) => {
    if (!(await canSendNotification(TELEGRAM_NOTIFICATION_KEYS.NEW_EMAIL))) return false;
    await sendTelegramMessage(buildNewEmailNotification(params), { chatId: process.env.TELEGRAM_EMAIL_NOTIFY_CHAT_ID });
    return true;
};

export const buildNotificationSettingChangedNotification = (params: {
    title: string;
    enabled: boolean;
    actorEmail?: string | null;
}) => [
    '<b>Изменены настройки уведомлений</b>',
    '',
    `<b>Уведомление:</b> ${escapeHtml(params.title)}`,
    `<b>Состояние:</b> ${params.enabled ? 'включено' : 'выключено'}`,
    params.actorEmail ? `<b>Изменил:</b> ${escapeHtml(params.actorEmail)}` : null,
].filter((row): row is string => row !== null).join('\n');

// Deliberately not behind a switch: an admin (or a compromised admin account) must not be able
// to silence notifications without the group seeing it.
export const notifyNotificationSettingChanged = async (params: {
    title: string;
    enabled: boolean;
    actorEmail?: string | null;
}) => {
    if (!isTelegramConfigured()) return false;
    await sendTelegramMessage(buildNotificationSettingChangedNotification(params));
    return true;
};
