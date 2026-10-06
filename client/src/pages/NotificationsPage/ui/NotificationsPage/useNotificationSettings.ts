import { useCallback, useEffect, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';

export type NotificationGroup = 'STUDENTS_AND_MOLLIE' | 'SECURITY' | 'EMAIL';

export interface NotificationSetting {
    key: string;
    title: string;
    group: NotificationGroup;
    recipient: 'GROUP_CHAT' | 'EMAIL_PRIVATE_CHAT';
    enabled: boolean;
    // False when the server has no Telegram chat configured for this notification:
    // it is not sent whatever the switch says.
    configured: boolean;
    updatedAt: string | null;
    updatedBy: { id: number; email: string } | null;
}

const fetchNotificationSettings = async () => {
    const { data } = await $apiPrivate.get<{ items: NotificationSetting[] }>('/telegram-notifications');
    return data.items;
};

const saveNotificationSetting = async (key: string, enabled: boolean) => {
    const { data } = await $apiPrivate.put<NotificationSetting>(`/telegram-notifications/${key}`, { enabled });
    return data;
};

const replaceSetting = (settings: NotificationSetting[], saved: NotificationSetting) => (
    settings.map((setting) => (setting.key === saved.key ? saved : setting))
);

export const useNotificationSettings = () => {
    const [settings, setSettings] = useState<NotificationSetting[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [failedKey, setFailedKey] = useState<string | null>(null);

    useEffect(() => {
        fetchNotificationSettings()
            .then(setSettings)
            .catch(() => setLoadError(true))
            .finally(() => setIsLoading(false));
    }, []);

    const onToggle = useCallback(async (setting: NotificationSetting) => {
        setSavingKey(setting.key);
        setFailedKey(null);
        try {
            const saved = await saveNotificationSetting(setting.key, !setting.enabled);
            setSettings((current) => replaceSetting(current, saved));
        } catch {
            setFailedKey(setting.key);
        } finally {
            setSavingKey(null);
        }
    }, []);

    return { settings, isLoading, loadError, savingKey, failedKey, onToggle };
};
