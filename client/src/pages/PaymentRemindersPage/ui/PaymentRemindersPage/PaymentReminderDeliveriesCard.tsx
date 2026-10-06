import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { DeliveryStatus, ReminderDelivery, ReminderLanguage } from './usePaymentReminders';
import s from './PaymentRemindersPage.module.scss';

const LANGUAGE_LABELS: Record<ReminderLanguage, string> = { RU: 'Русский', EN: 'English', NL: 'Nederlands' };
const STATUS_LABELS: Record<DeliveryStatus, string> = {
    PENDING: 'В очереди',
    SENT: 'Отправлено',
    FAILED: 'Ошибка',
    SKIPPED: 'Пропущено',
};

const statusFilterOptions: SelectOption<string>[] = [
    { value: '', content: 'Все статусы' },
    ...Object.entries(STATUS_LABELS).map(([value, content]) => ({ value, content })),
];

const clientName = (delivery: ReminderDelivery) => {
    const client = delivery.subscription?.customer?.client;
    const name = `${client?.firstName ?? ''} ${client?.lastName ?? ''}`.trim();
    return name || delivery.recipientEmail || '—';
};

const formatDateTime = (value?: string | null) => (
    value
        ? new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—'
);

interface PaymentReminderDeliveriesCardProps {
    isLoading: boolean;
    deliveries: ReminderDelivery[];
    statusFilter: string;
    onStatusFilterChange: (value: string) => void;
}

const DeliveriesTable = ({ deliveries }: { deliveries: ReminderDelivery[] }) => {
    const { t } = useTranslation();
    return (
        <div className={s.tableWrapper}>
            <table className={s.table}>
                <thead>
                    <tr>
                        <th>{t('Клиент')}</th>
                        <th>{t('Дата платежа')}</th>
                        <th>{t('Язык')}</th>
                        <th>{t('Статус')}</th>
                        <th>{t('Создано')}</th>
                        <th>{t('Ошибка')}</th>
                    </tr>
                </thead>
                <tbody>
                    {deliveries.map((delivery) => (
                        <tr key={delivery.id}>
                            <td>{clientName(delivery)}</td>
                            <td>{formatDateTime(delivery.targetPaymentDate)}</td>
                            <td>{LANGUAGE_LABELS[delivery.language]}</td>
                            <td>
                                <span className={`${s.badge} ${s[`status_${delivery.status}`]}`}>
                                    {STATUS_LABELS[delivery.status]}
                                </span>
                            </td>
                            <td>{formatDateTime(delivery.createdAt)}</td>
                            <td className={s.errorCell}>{delivery.errorMessage ?? '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export const PaymentReminderDeliveriesCard = memo((props: PaymentReminderDeliveriesCardProps) => {
    const { isLoading, deliveries, statusFilter, onStatusFilterChange } = props;

    return (
        <Card padding="24" fullWidth className={s.card}>
            <VStack max gap="16">
                <HStack max justify="between" align="center" wrap="wrap">
                    <Text title="Очередь и история" size="m" bold />
                    <Select
                        options={statusFilterOptions}
                        value={statusFilter}
                        onChange={(value) => onStatusFilterChange(value ?? '')}
                    />
                </HStack>

                {isLoading && <Skeleton width="100%" height={200} border="12px" />}

                {!isLoading && deliveries.length === 0 && (
                    <Text size="s" text="Пока нет ни одной отправки." />
                )}

                {!isLoading && deliveries.length > 0 && <DeliveriesTable deliveries={deliveries} />}
            </VStack>
        </Card>
    );
});
