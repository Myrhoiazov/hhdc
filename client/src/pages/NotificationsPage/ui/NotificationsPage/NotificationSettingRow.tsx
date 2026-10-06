import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './NotificationsPage.module.scss';
import { notificationDescription } from './notificationTexts';
import type { NotificationSetting } from './useNotificationSettings';

interface NotificationSettingRowProps {
    setting: NotificationSetting;
    isSaving: boolean;
    hasFailed: boolean;
    onToggle: (setting: NotificationSetting) => void;
}

const formatUpdatedAt = (value: string) => new Date(value).toLocaleString('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
});

const UpdatedBy = ({ setting }: { setting: NotificationSetting }) => {
    const { t } = useTranslation();
    if (!setting.updatedAt) return null;

    return (
        <span className={s.meta}>
            {t('Изменил')} {setting.updatedBy?.email ?? t('неизвестно')}, {formatUpdatedAt(setting.updatedAt)}
        </span>
    );
};

export const NotificationSettingRow = memo(({ setting, isSaving, hasFailed, onToggle }: NotificationSettingRowProps) => {
    const { t } = useTranslation();
    const description = notificationDescription[setting.key];
    const onClick = useCallback(() => onToggle(setting), [onToggle, setting]);

    return (
        <li className={s.row}>
            <div className={s.rowText}>
                <span className={s.rowTitle}>{t(setting.title)}</span>
                {description && <span className={s.description}>{t(description)}</span>}
                {!setting.configured && <span className={s.warning}>{t('Telegram для этого уведомления не настроен')}</span>}
                {hasFailed && <span className={s.error} role="alert">{t('Не удалось сохранить настройку')}</span>}
                <UpdatedBy setting={setting} />
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={setting.enabled}
                aria-label={t(setting.title)}
                disabled={isSaving}
                className={classNames(s.switch, { [s.switchOn]: setting.enabled }, [])}
                onClick={onClick}
            >
                <span className={s.thumb} />
            </button>
        </li>
    );
});
