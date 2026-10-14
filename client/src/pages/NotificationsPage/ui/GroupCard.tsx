import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { NotificationGroup, NotificationSetting } from '@/entities/Notification';
import { Panel } from '@/shared/ui/Panel';
import own from './NotificationsPage.module.scss';
import { SettingRow } from './SettingRow';

interface GroupProps {
    group: NotificationGroup;
    settings: NotificationSetting[];
    savingKey: string;
    failed: { key: string; message: string };
    onToggle: (setting: NotificationSetting) => void;
    onSaved: () => void;
}

export const GroupCard = memo(
    ({ group, settings, savingKey, failed, onToggle, onSaved }: GroupProps) => {
        const { t } = useTranslation();
        if (!settings.length) return null;
        const title = t(`Notification group: ${group}`);
        return (
            <Panel aria-label={title}>
                <h2 className={own.groupTitle}>{title}</h2>
                <ul className={own.rows}>
                    {settings.map((setting) => (
                        <SettingRow
                            key={setting.key}
                            setting={setting}
                            saving={savingKey === setting.key}
                            error={failed.key === setting.key ? failed.message || t('Unknown') : ''}
                            onToggle={onToggle}
                            onSaved={onSaved}
                        />
                    ))}
                </ul>
            </Panel>
        );
    }
);
