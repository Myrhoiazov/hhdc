import { memo } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';
import { Text } from '@/shared/ui/Text/Text';
import { VStack } from '@/shared/ui/Stack';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { StateView } from '@/shared/ui/StateView';
import { getUserAuthData } from '@/entities/User';
import { RoleKey } from '@/entities/Role';
import s from './NotificationsPage.module.scss';
import { NotificationGroupCard } from './NotificationGroupCard';
import { NOTIFICATION_GROUPS } from './notificationTexts';
import { useNotificationSettings } from './useNotificationSettings';

const NotificationSettingsList = () => {
    const { t } = useTranslation();
    const { settings, isLoading, loadError, savingKey, failedKey, onToggle } = useNotificationSettings();

    if (isLoading) return <Skeleton width="100%" height={320} border="14px" />;
    if (loadError) {
        return <StateView tone="error" title={t('Не удалось загрузить настройки уведомлений')} text={t('Проверьте соединение с сервером.')} />;
    }

    return (
        <>
            {NOTIFICATION_GROUPS.map((group) => (
                <NotificationGroupCard
                    key={group}
                    group={group}
                    settings={settings.filter((setting) => setting.group === group)}
                    savingKey={savingKey}
                    failedKey={failedKey}
                    onToggle={onToggle}
                />
            ))}
        </>
    );
};

const NotificationsPage = memo(() => {
    const { t } = useTranslation();
    const isAdmin = useSelector(getUserAuthData)?.role === RoleKey.ADMIN;

    return (
        <Page>
            <VStack max gap="24" className={s.page}>
                <div>
                    <Text title={t('Уведомления')} size="l" bold />
                    <Text
                        text={t('Какие сообщения бот отправляет в Telegram. Изменение сохраняется сразу, и о нём приходит сообщение в группу.')}
                        size="s"
                        className={s.subtitle}
                    />
                </div>
                {isAdmin
                    ? <NotificationSettingsList />
                    : <StateView title={t('Раздел доступен только администратору')} />}
            </VStack>
        </Page>
    );
});

export default NotificationsPage;
