import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import s from './NotificationsPage.module.scss';
import { NotificationSettingRow } from './NotificationSettingRow';
import { notificationGroupTitle } from './notificationTexts';
import type { NotificationGroup, NotificationSetting } from './useNotificationSettings';

interface NotificationGroupCardProps {
    group: NotificationGroup;
    settings: NotificationSetting[];
    savingKey: string | null;
    failedKey: string | null;
    onToggle: (setting: NotificationSetting) => void;
}

export const NotificationGroupCard = memo((props: NotificationGroupCardProps) => {
    const { group, settings, savingKey, failedKey, onToggle } = props;
    const { t } = useTranslation();
    const titleId = `notification-group-${group}`;

    if (!settings.length) return null;

    return (
        <section className={s.card} aria-labelledby={titleId}>
            <h2 id={titleId} className={s.groupTitle}>{t(notificationGroupTitle[group])}</h2>
            <ul className={s.rows}>
                {settings.map((setting) => (
                    <NotificationSettingRow
                        key={setting.key}
                        setting={setting}
                        isSaving={savingKey === setting.key}
                        hasFailed={failedKey === setting.key}
                        onToggle={onToggle}
                    />
                ))}
            </ul>
        </section>
    );
});
