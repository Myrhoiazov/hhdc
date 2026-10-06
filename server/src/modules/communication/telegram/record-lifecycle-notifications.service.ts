import { canSendNotification, escapeHtml, sendTelegramMessage } from './telegram.service';
import { buildIndividualOrSummaryMessages, crmLink, joinRows } from './notification-message.utils';
import { TELEGRAM_NOTIFICATION_KEYS, type TelegramNotificationKey } from './notification-settings.types';

export type MollieRecordSource = 'CRM' | 'MOLLIE_SYNC';
export type MollieMandateAction = 'CREATED' | 'REVOKED';
export type MollieSubscriptionAction = 'CREATED' | 'CANCELED' | 'RESTARTED';

export interface StudentDeletedNotification {
    firstName?: string | null;
    lastName?: string | null;
    branchName?: string | null;
    deletedByEmail?: string | null;
}

export interface MollieCustomerDeletedNotification {
    name?: string | null;
    deletedByEmail?: string | null;
}

export interface MollieMandateNotification {
    action: MollieMandateAction;
    source: MollieRecordSource;
    // Local Customer id — the link target; the mandate itself has no page in the CRM.
    customerId: number;
    customerName?: string | null;
    method?: string | null;
    actorEmail?: string | null;
    // Active subscriptions cancelled together with a revoked mandate.
    canceledSubscriptions?: number;
}

export interface MollieSubscriptionNotification {
    action: MollieSubscriptionAction;
    source: MollieRecordSource;
    customerId: number;
    customerName?: string | null;
    amountValue: string;
    amountCurrency: string;
    interval?: string | null;
    startDate?: string | null;
    description?: string | null;
    actorEmail?: string | null;
}

const sourceLabel: Record<MollieRecordSource, string> = {
    CRM: 'создан в CRM',
    MOLLIE_SYNC: 'синхронизация с Mollie',
};

const mandateTitle: Record<MollieMandateAction, string> = {
    CREATED: 'Мандат Mollie создан',
    REVOKED: 'Мандат Mollie отозван',
};

const subscriptionTitle: Record<MollieSubscriptionAction, string> = {
    CREATED: 'Подписка Mollie создана',
    CANCELED: 'Подписка Mollie отменена',
    RESTARTED: 'Подписка Mollie перезапущена',
};

const nameRow = (label: string, name?: string | null) => `<b>${label}:</b> ${escapeHtml(name?.trim() || 'Без имени')}`;

const optionalRow = (label: string, value?: string | number | null) => (
    value === undefined || value === null || value === '' ? null : `<b>${label}:</b> ${escapeHtml(String(value))}`
);

// A deleted record has no card left in the CRM, so these two messages carry no link.
export const buildStudentDeletedNotification = (student: StudentDeletedNotification) => joinRows([
    '<b>Ученик удалён</b>',
    '',
    nameRow('Имя', [student.firstName, student.lastName].filter(Boolean).join(' ')),
    optionalRow('Филиал', student.branchName),
    optionalRow('Удалил', student.deletedByEmail),
]);

export const buildMollieCustomerDeletedNotification = (customer: MollieCustomerDeletedNotification) => joinRows([
    '<b>Клиент Mollie удалён</b>',
    '',
    nameRow('Имя', customer.name),
    optionalRow('Удалил', customer.deletedByEmail),
]);

export const buildMollieMandateNotification = (mandate: MollieMandateNotification) => joinRows([
    `<b>${mandateTitle[mandate.action]}</b>`,
    '',
    nameRow('Плательщик', mandate.customerName),
    optionalRow('Метод', mandate.method),
    mandate.action === 'CREATED' ? `<b>Источник:</b> ${sourceLabel[mandate.source]}` : null,
    optionalRow('Отменено подписок', mandate.canceledSubscriptions || null),
    optionalRow('Сотрудник', mandate.actorEmail),
    crmLink(`/mollie/customers/${mandate.customerId}`, 'Открыть карточку'),
]);

export const buildMollieSubscriptionNotification = (subscription: MollieSubscriptionNotification) => joinRows([
    `<b>${subscriptionTitle[subscription.action]}</b>`,
    '',
    nameRow('Плательщик', subscription.customerName),
    `<b>Сумма:</b> ${escapeHtml(`${subscription.amountValue} ${subscription.amountCurrency}`)}`,
    optionalRow('Интервал', subscription.interval),
    optionalRow('Старт', subscription.startDate),
    optionalRow('Описание', subscription.description),
    subscription.action === 'CREATED' ? `<b>Источник:</b> ${sourceLabel[subscription.source]}` : null,
    optionalRow('Сотрудник', subscription.actorEmail),
    crmLink(`/mollie/customers/${subscription.customerId}`, 'Открыть карточку'),
]);

const buildSyncSummary = (title: string) => (count: number) => joinRows([
    `<b>${title}</b>`,
    '',
    `<b>Добавлено при синхронизации:</b> ${count}`,
    crmLink('/mollie/customers', 'Открыть список'),
]);

export const buildMollieMandatesSummaryNotification = buildSyncSummary('Новые мандаты Mollie');
export const buildMollieSubscriptionsSummaryNotification = buildSyncSummary('Новые подписки Mollie');

const sendWhenEnabled = async (key: TelegramNotificationKey, messages: string[]) => {
    if (!messages.length || !(await canSendNotification(key))) return false;
    for (const message of messages) {
        await sendTelegramMessage(message);
    }
    return true;
};

export const notifyStudentDeleted = (student: StudentDeletedNotification) => (
    sendWhenEnabled(TELEGRAM_NOTIFICATION_KEYS.STUDENT_DELETED, [buildStudentDeletedNotification(student)])
);

export const notifyMollieCustomerDeleted = (customer: MollieCustomerDeletedNotification) => (
    sendWhenEnabled(TELEGRAM_NOTIFICATION_KEYS.MOLLIE_CUSTOMER_DELETED, [buildMollieCustomerDeletedNotification(customer)])
);

export const notifyMollieMandates = (mandates: MollieMandateNotification[]) => sendWhenEnabled(
    TELEGRAM_NOTIFICATION_KEYS.MOLLIE_MANDATE,
    buildIndividualOrSummaryMessages(mandates, buildMollieMandateNotification, buildMollieMandatesSummaryNotification),
);

export const notifyMollieSubscriptions = (subscriptions: MollieSubscriptionNotification[]) => sendWhenEnabled(
    TELEGRAM_NOTIFICATION_KEYS.MOLLIE_SUBSCRIPTION,
    buildIndividualOrSummaryMessages(
        subscriptions,
        buildMollieSubscriptionNotification,
        buildMollieSubscriptionsSummaryNotification,
    ),
);
