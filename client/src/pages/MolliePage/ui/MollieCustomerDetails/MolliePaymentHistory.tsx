import { memo } from 'react';
import { Text } from '@/shared/ui/Text/Text';
import { VStack } from '@/shared/ui/Stack';
import { Card } from '@/shared/ui/Card/Card';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { usePaymentHistory } from './usePaymentHistory';
import { PaymentHistoryDayCard } from './PaymentHistoryDayCard';
import s from './MollieCustomerDetails.module.scss';

export const MolliePaymentHistory = memo(({ customerId }: { customerId: string }) => {
    const { payments, isLoading, error, groupedPayments, previewPaymentInvoice, downloadPaymentInvoice } = usePaymentHistory(customerId);

    if (isLoading) {
        return (
            <VStack max gap="16">
                <Text title="Платежи и отмены по датам" size="m" bold />
                <Skeleton width="100%" height={72} border="14px" />
                <Skeleton width="100%" height={72} border="14px" />
            </VStack>
        );
    }

    if (error) {
        return (
            <Card padding="24" fullWidth className={s.historyCard}>
                <Text title="Платежи и отмены по датам" size="m" bold />
                <Text text="Не удалось загрузить историю платежей." size="s" />
            </Card>
        );
    }

    return (
        <VStack max gap="16" className={s.history}>
            <Text title="Платежи и отмены по датам" size="m" bold />
            {!payments.length ? (
                <Card padding="24" fullWidth className={s.historyCard}>
                    <Text text="Платежи пока не найдены." size="s" />
                </Card>
            ) : Object.entries(groupedPayments).map(([date, items]) => (
                <PaymentHistoryDayCard
                    key={date}
                    date={date}
                    payments={items}
                    onPreviewInvoice={previewPaymentInvoice}
                    onDownloadInvoice={downloadPaymentInvoice}
                />
            ))}
        </VStack>
    );
});
