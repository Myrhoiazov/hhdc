import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { NotificationSetting } from '@/entities/Notification';
import { formatDateTime } from '@/shared/lib/format/date';
import { NotificationTemplate } from './NotificationTemplate';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from './NotificationsPage.module.scss';

const ChangedBy = memo(({ setting }: { setting: NotificationSetting }) => {
    const { t } = useTranslation();
    if (!setting.updatedAt) return null;
    const who = setting.updatedBy
        ? setting.updatedBy.name || setting.updatedBy.email
        : t('Unknown');
    return (
        <span className={own.meta}>
            {t('Changed by {{who}}, {{when}}', { who, when: formatDateTime(setting.updatedAt) })}
        </span>
    );
});

interface RowProps {
    setting: NotificationSetting;
    saving: boolean;
    error: string;
    onToggle: (setting: NotificationSetting) => void;
    onSaved: () => void;
}

export const SettingRow = memo(({ setting, saving, error, onToggle, onSaved }: RowProps) => {
    const { t } = useTranslation();
    const title = t(`Notification: ${setting.key}`, { defaultValue: setting.title });
    return (
        <li className={own.row}>
            <div className={own.rowHead}>
                <div className={own.rowText}>
                    <span className={own.rowTitle}>{title}</span>
                    <span className={own.description}>
                        {t(`Notification description: ${setting.key}`, { defaultValue: '' })}
                    </span>
                    {error && (
                        <span role="alert" className={cls.error}>
                            {t('Unable to save')}: {error}
                        </span>
                    )}
                    <ChangedBy setting={setting} />
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={setting.enabled}
                    aria-label={title}
                    disabled={saving}
                    className={`${own.switch} ${setting.enabled ? own.switchOn : ''}`}
                    onClick={() => onToggle(setting)}
                >
                    <span className={own.thumb} />
                </button>
            </div>
            <NotificationTemplate
                key={setting.template}
                setting={setting}
                title={title}
                onSaved={onSaved}
            />
        </li>
    );
});
