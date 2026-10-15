import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { NOTIFICATION_GROUPS } from '@/entities/Notification';
import { CrmLayout } from '@/widgets/Page';
import { RequestState } from '@/shared/ui/RequestState';
import own from './NotificationsPage.module.scss';
import { GroupCard } from './GroupCard';
import { useNotificationSettings } from '../model/useNotificationSettings';

// Which messages the bot sends to Telegram.
export const NotificationsPage = memo(() => {
    const { t } = useTranslation();
    const { list, savingKey, failed, toggle } = useNotificationSettings();
    const settings = list.data ?? [];
    const notConfigured = settings.some((setting) => !setting.configured);
    return (
        <CrmLayout title="Notifications">
            <p className={own.intro}>
                {t(
                    'Which messages the bot sends to Telegram and what they say. A switch is saved at once, and the chat is told about it; a text is saved with its button.'
                )}
            </p>
            <RequestState error={list.error} loading={list.loading && !list.data} />
            {notConfigured && (
                <p className={own.warning} role="status">
                    {t(
                        'Telegram is not set up on the server: the bot token or the chat is missing, so nothing is sent whatever the switches say.'
                    )}
                </p>
            )}
            {NOTIFICATION_GROUPS.map((group) => (
                <GroupCard
                    key={group}
                    group={group}
                    settings={settings.filter((setting) => setting.group === group)}
                    savingKey={savingKey}
                    failed={failed}
                    onToggle={(setting) => void toggle(setting)}
                    onSaved={() => void list.refresh()}
                />
            ))}
        </CrmLayout>
    );
});
