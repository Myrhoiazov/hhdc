import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    NotificationSetting,
    saveNotificationTemplate,
    sendTestNotification,
} from '@/entities/Notification';

type Notice = { tone: 'ok' | 'error'; text: string } | null;

// Saving, returning to the first text and sending a test: one request at a time, with its outcome told below.
export const useTemplateActions = (setting: NotificationSetting, onSaved: () => void) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState(setting.template);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<Notice>(null);
    const run = async (work: () => Promise<string>) => {
        setBusy(true);
        setNotice(null);
        try {
            setNotice({ tone: 'ok', text: await work() });
        } catch (cause) {
            setNotice({
                tone: 'error',
                text: cause instanceof Error ? cause.message : t('Unable to save'),
            });
        } finally {
            setBusy(false);
        }
    };
    return {
        draft,
        setDraft,
        busy,
        notice,
        changed: draft.trim() !== setting.template,
        save: () =>
            run(async () => {
                await saveNotificationTemplate(setting.key, draft.trim() || null);
                onSaved();
                return t('Text saved');
            }),
        reset: () =>
            run(async () => {
                await saveNotificationTemplate(setting.key, null);
                setDraft(setting.defaultTemplate);
                onSaved();
                return t('The first text is back');
            }),
        test: () =>
            run(async () => {
                if (!(await sendTestNotification(setting.key)).sent)
                    throw new Error(t('Telegram did not accept the message'));
                return t('Test message sent');
            }),
    };
};

export type TemplateActions = ReturnType<typeof useTemplateActions>;
