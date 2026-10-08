import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listNotificationSettings, NOTIFICATION_GROUPS, NotificationGroup, NotificationSetting, setNotificationEnabled } from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { CrmLayout, RequestState } from './common';
import cls from './CrmPage.module.scss';
import own from './NotificationsPage.module.scss';

// A switch is saved at once. While it is being saved it cannot be pressed again, and a refusal
// is shown under the notification it belongs to.
const useNotificationSettings = () => {
    const list = useResource(listNotificationSettings);
    const [savingKey, setSavingKey] = useState('');
    const [failed, setFailed] = useState({ key: '', message: '' });
    const { refresh } = list;
    const toggle = useCallback(async (setting: NotificationSetting) => {
        setSavingKey(setting.key);
        setFailed({ key: '', message: '' });
        try { await setNotificationEnabled(setting.key, !setting.enabled); await refresh(); }
        catch (cause) { setFailed({ key: setting.key, message: cause instanceof Error ? cause.message : '' }); }
        finally { setSavingKey(''); }
    }, [refresh]);
    return { list, savingKey, failed, toggle };
};

const ChangedBy = memo(({ setting }: { setting: NotificationSetting }) => {
    const { t } = useTranslation();
    if (!setting.updatedAt) return null;
    const who = setting.updatedBy ? setting.updatedBy.name || setting.updatedBy.email : t('Unknown');
    return <span className={own.meta}>{t('Changed by {{who}}, {{when}}', { who, when: new Date(setting.updatedAt).toLocaleString() })}</span>;
});

interface RowProps { setting: NotificationSetting; saving: boolean; error: string; onToggle: (setting: NotificationSetting) => void }

const SettingRow = memo(({ setting, saving, error, onToggle }: RowProps) => {
    const { t } = useTranslation();
    const title = t(`Notification: ${setting.key}`, { defaultValue: setting.title });
    return <li className={own.row}>
        <div className={own.rowText}>
            <span className={own.rowTitle}>{title}</span>
            <span className={own.description}>{t(`Notification description: ${setting.key}`, { defaultValue: '' })}</span>
            {error && <span role="alert" className={cls.error}>{t('Unable to save')}: {error}</span>}
            <ChangedBy setting={setting} />
        </div>
        <button type="button" role="switch" aria-checked={setting.enabled} aria-label={title} disabled={saving}
            className={`${own.switch} ${setting.enabled ? own.switchOn : ''}`} onClick={() => onToggle(setting)}>
            <span className={own.thumb} />
        </button>
    </li>;
});

interface GroupProps { group: NotificationGroup; settings: NotificationSetting[]; savingKey: string; failed: { key: string; message: string }; onToggle: (setting: NotificationSetting) => void }

const GroupCard = memo(({ group, settings, savingKey, failed, onToggle }: GroupProps) => {
    const { t } = useTranslation();
    if (!settings.length) return null;
    const title = t(`Notification group: ${group}`);
    return <section className={cls.panel} aria-label={title}>
        <h2 className={own.groupTitle}>{title}</h2>
        <ul className={own.rows}>{settings.map(setting => <SettingRow key={setting.key} setting={setting} saving={savingKey === setting.key}
            error={failed.key === setting.key ? failed.message || t('Unknown') : ''} onToggle={onToggle} />)}</ul>
    </section>;
});

// Which messages the bot sends to Telegram.
export const NotificationsPage = memo(() => {
    const { t } = useTranslation();
    const { list, savingKey, failed, toggle } = useNotificationSettings();
    const settings = list.data ?? [];
    const notConfigured = settings.some(setting => !setting.configured);
    return <CrmLayout title="Notifications">
        <p className={own.intro}>{t('Which messages the bot sends to Telegram. A change is saved at once, and the chat is told about it.')}</p>
        <RequestState error={list.error} loading={list.loading && !list.data} />
        {notConfigured && <p className={own.warning} role="status">{t('Telegram is not set up on the server: the bot token or the chat is missing, so nothing is sent whatever the switches say.')}</p>}
        {NOTIFICATION_GROUPS.map(group => <GroupCard key={group} group={group} settings={settings.filter(setting => setting.group === group)}
            savingKey={savingKey} failed={failed} onToggle={setting => void toggle(setting)} />)}
    </CrmLayout>;
});
