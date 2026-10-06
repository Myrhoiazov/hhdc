import { canSendNotification, escapeHtml, sendTelegramMessage } from './telegram.service';
import { buildIndividualOrSummaryMessages, crmLink, joinRows } from './notification-message.utils';
import { TELEGRAM_NOTIFICATION_KEYS } from './notification-settings.types';

export type NewStudentSource = 'CRM' | 'TELEGRAM_MINIAPP';
export type NewMollieCustomerSource = 'CRM' | 'MOLLIE_SYNC';

export interface NewStudentNotification {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    branchName?: string | null;
    createdByEmail?: string | null;
    source: NewStudentSource;
}

export interface NewMollieCustomerNotification {
    id: number;
    name?: string | null;
    source: NewMollieCustomerSource;
    linkedToStudent: boolean;
}

const studentSourceLabel: Record<NewStudentSource, string> = {
    CRM: 'CRM',
    TELEGRAM_MINIAPP: 'Telegram Mini App',
};

const customerSourceLabel: Record<NewMollieCustomerSource, string> = {
    CRM: 'создан в CRM',
    MOLLIE_SYNC: 'синхронизация с Mollie',
};

export const buildNewStudentNotification = (student: NewStudentNotification) => joinRows([
    '<b>Новый ученик</b>',
    '',
    `<b>Имя:</b> ${escapeHtml([student.firstName, student.lastName].filter(Boolean).join(' ') || 'Без имени')}`,
    student.branchName ? `<b>Филиал:</b> ${escapeHtml(student.branchName)}` : null,
    `<b>Источник:</b> ${studentSourceLabel[student.source]}`,
    student.createdByEmail ? `<b>Создал:</b> ${escapeHtml(student.createdByEmail)}` : null,
    crmLink(`/clients/${student.id}`, 'Открыть карточку'),
]);

export const buildNewMollieCustomerNotification = (customer: NewMollieCustomerNotification) => joinRows([
    '<b>Новый клиент Mollie</b>',
    '',
    `<b>Имя:</b> ${escapeHtml(customer.name?.trim() || 'Без имени')}`,
    `<b>Источник:</b> ${customerSourceLabel[customer.source]}`,
    `<b>Ученик:</b> ${customer.linkedToStudent ? 'привязан' : 'не привязан'}`,
    crmLink(`/mollie/customers/${customer.id}`, 'Открыть карточку'),
]);

export const buildNewMollieCustomersSummaryNotification = (count: number) => joinRows([
    '<b>Новые клиенты Mollie</b>',
    '',
    `<b>Добавлено при синхронизации:</b> ${count}`,
    crmLink('/mollie/customers', 'Открыть список'),
]);

export const notifyNewStudent = async (student: NewStudentNotification) => {
    if (!(await canSendNotification(TELEGRAM_NOTIFICATION_KEYS.NEW_STUDENT))) return false;
    await sendTelegramMessage(buildNewStudentNotification(student));
    return true;
};

const buildNewMollieCustomerMessages = (customers: NewMollieCustomerNotification[]) => buildIndividualOrSummaryMessages(
    customers,
    buildNewMollieCustomerNotification,
    buildNewMollieCustomersSummaryNotification,
);

export const notifyNewMollieCustomers = async (customers: NewMollieCustomerNotification[]) => {
    if (!customers.length || !(await canSendNotification(TELEGRAM_NOTIFICATION_KEYS.NEW_MOLLIE_CUSTOMER))) return false;
    for (const message of buildNewMollieCustomerMessages(customers)) {
        await sendTelegramMessage(message);
    }
    return true;
};
