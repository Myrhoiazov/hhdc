import { postData, putData, readData } from '@/shared/api/request';
import { NotificationSetting } from '../model/types';

export const listNotificationSettings = async () =>
    readData<NotificationSetting[]>('/telegram-notifications');

const changeNotification = async (
    key: string,
    change: { enabled?: boolean; template?: string | null }
) => putData<NotificationSetting>(`/telegram-notifications/${key}`, change);

export const setNotificationEnabled = async (key: string, enabled: boolean) =>
    changeNotification(key, { enabled });

// `null` returns to the text the notification started with.
export const saveNotificationTemplate = async (key: string, template: string | null) =>
    changeNotification(key, { template });

export const sendTestNotification = async (key: string) =>
    postData<{ sent: boolean; text: string }>(`/telegram-notifications/${key}/test`);
