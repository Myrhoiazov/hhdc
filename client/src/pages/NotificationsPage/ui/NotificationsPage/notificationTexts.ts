import type { NotificationGroup } from './useNotificationSettings';

// Display order of the groups on the page.
export const NOTIFICATION_GROUPS: NotificationGroup[] = ['STUDENTS_AND_MOLLIE', 'SECURITY', 'EMAIL'];

export const notificationGroupTitle: Record<NotificationGroup, string> = {
    STUDENTS_AND_MOLLIE: 'Ученики и Mollie',
    SECURITY: 'Безопасность',
    EMAIL: 'Почта',
};

// Keyed by the server's notification key; a key without an entry simply has no description.
export const notificationDescription: Record<string, string> = {
    NEW_STUDENT: 'Сообщение в группу, когда в CRM или в Telegram Mini App создан новый ученик.',
    STUDENT_DELETED: 'Сообщение в группу, когда ученика удалили из CRM: имя, филиал и кто удалил.',
    NEW_MOLLIE_CUSTOMER: 'Сообщение в группу о новом клиенте Mollie: созданном в CRM или пришедшем при синхронизации.',
    MOLLIE_CUSTOMER_DELETED: 'Сообщение в группу, когда клиента Mollie удалили из CRM.',
    MOLLIE_MANDATE: 'Создание и отзыв мандатов Mollie: в CRM или пришедших при синхронизации.',
    MOLLIE_SUBSCRIPTION:
        'Создание, отмена и перезапуск подписок Mollie: в CRM или пришедших при синхронизации.',
    MOLLIE_PAYMENT: 'Оплаты, ошибки, отмены, возвраты и chargeback по платежам Mollie.',
    LOGIN_BLOCKED: 'Вход заблокирован после слишком большого числа неудачных попыток.',
    NEW_DEVICE_AFTER_FAILURES: 'Успешный вход с нового устройства сразу после неудачных попыток.',
    ROLE_CHANGED: 'Пользователю CRM изменили роль.',
    NEW_EMAIL: 'Новое входящее письмо. Отправляется в личный чат администратора, а не в группу.',
};
