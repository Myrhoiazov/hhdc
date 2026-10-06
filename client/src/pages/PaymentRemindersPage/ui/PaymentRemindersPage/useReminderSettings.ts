import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { SelectOption } from '@/shared/ui/Select/Select';

export interface ReminderSettings {
    offsetDays: 3 | 7;
    sendHour: number;
    sendMinute: number;
    senderEmailAccountId: number | null;
    enabled: boolean;
}

export interface EmailAccountOption {
    id: number;
    label: string;
    username: string;
    isActive: boolean;
}

// The backend validation is `.strict()` — send only the whitelisted fields.
const buildSettingsPayload = (settings: ReminderSettings) => ({
    offsetDays: settings.offsetDays,
    sendHour: settings.sendHour,
    sendMinute: settings.sendMinute,
    senderEmailAccountId: settings.senderEmailAccountId,
    enabled: settings.enabled,
});

export const useReminderSettings = () => {
    const [settings, setSettings] = useState<ReminderSettings>();
    const [emailAccounts, setEmailAccounts] = useState<EmailAccountOption[]>([]);
    const [isSettingsLoading, setIsSettingsLoading] = useState(true);
    const [isSettingsSaving, setIsSettingsSaving] = useState(false);

    const loadSettings = useCallback(() => {
        setIsSettingsLoading(true);
        return Promise.all([
            $apiPrivate.get<ReminderSettings>('/payment-reminders/settings'),
            $apiPrivate.get<EmailAccountOption[]>('/email/accounts'),
        ])
            .then(([settingsRes, accountsRes]) => {
                setSettings(settingsRes.data);
                setEmailAccounts(accountsRes.data.filter((account) => account.isActive));
            })
            .catch(() => toast.error('Не удалось загрузить настройки рассылки'))
            .finally(() => setIsSettingsLoading(false));
    }, []);

    useEffect(() => { loadSettings(); }, [loadSettings]);

    const onSaveSettings = useCallback(async () => {
        if (!settings) return;
        setIsSettingsSaving(true);
        try {
            const { data } = await $apiPrivate.put<ReminderSettings>('/payment-reminders/settings', buildSettingsPayload(settings));
            setSettings(data);
            toast.success('Настройки рассылки сохранены');
        } catch {
            toast.error('Не удалось сохранить настройки');
        } finally {
            setIsSettingsSaving(false);
        }
    }, [settings]);

    const emailAccountOptions: SelectOption<string>[] = useMemo(() => [
        { value: '', content: 'Не выбран' },
        ...emailAccounts.map((account) => ({ value: String(account.id), content: `${account.label} (${account.username})` })),
    ], [emailAccounts]);

    return {
        settings, setSettings, emailAccountOptions, isSettingsLoading, isSettingsSaving, onSaveSettings,
    };
};
