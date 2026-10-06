import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/Text/Text';
import type { MollieConnectionStatus } from './useMollieConnection';
import s from './CrmSettingsPage.module.scss';

interface MollieConnectionDetailsProps {
    connection: MollieConnectionStatus;
}

const formatDate = (value?: string) => value ? new Date(value).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) : '—';

export const MollieConnectionDetails = memo(({ connection }: MollieConnectionDetailsProps) => {
    const { t } = useTranslation();

    return (
        <>
            <div className={s.explanation}>
                <Text title="Для чего это нужно" size="s" bold />
                <p>{t('OAuth нужен, если CRM будет подключать Mollie-аккаунты разных компаний или если доступ необходимо выдавать и отзывать из Mollie без ручной замены API key. CRM сохраняет зашифрованные токены и автоматически обновляет их.')}</p>
                <p>{t('Для текущей CRM с одной организацией OAuth необязателен: система продолжает работать через настроенный серверный API key. Подключайте OAuth только при необходимости.')}</p>
            </div>
            {connection.source === 'oauth' && (
                <div className={s.detailsGrid}>
                    <DetailItem label={t('Токен истекает')} value={formatDate(connection.expiresAt)} />
                    <DetailItem label={t('Последнее обновление')} value={formatDate(connection.lastRefreshedAt || connection.updatedAt)} />
                </div>
            )}
        </>
    );
});

const DetailItem = ({ label, value }: { label: string; value: string }) => (
    <div className={s.detailItem}>
        <span className={s.label}>{label}</span>
        <span>{value}</span>
    </div>
);
