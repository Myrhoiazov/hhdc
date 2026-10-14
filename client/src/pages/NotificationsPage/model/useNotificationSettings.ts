import { useCallback, useState } from 'react';
import {
    listNotificationSettings,
    NotificationSetting,
    setNotificationEnabled,
} from '@/entities/Notification';
import { useResource } from '@/shared/lib/useResource/useResource';

// A switch is saved at once. While it is being saved it cannot be pressed again, and a refusal
// is shown under the notification it belongs to.
export const useNotificationSettings = () => {
    const list = useResource(listNotificationSettings);
    const [savingKey, setSavingKey] = useState('');
    const [failed, setFailed] = useState({ key: '', message: '' });
    const { refresh } = list;
    const toggle = useCallback(
        async (setting: NotificationSetting) => {
            setSavingKey(setting.key);
            setFailed({ key: '', message: '' });
            try {
                await setNotificationEnabled(setting.key, !setting.enabled);
                await refresh();
            } catch (cause) {
                setFailed({
                    key: setting.key,
                    message: cause instanceof Error ? cause.message : '',
                });
            } finally {
                setSavingKey('');
            }
        },
        [refresh]
    );
    return { list, savingKey, failed, toggle };
};
