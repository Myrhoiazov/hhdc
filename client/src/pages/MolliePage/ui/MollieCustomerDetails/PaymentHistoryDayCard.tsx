import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Card } from '@/shared/ui/Card/Card';
import { VStack } from '@/shared/ui/Stack';
import { MolliePayment } from '@/entities/MollieClient';
import { formatAmount, paymentStatusLabel } from './usePaymentHistory';
import s from './MollieCustomerDetails.module.scss';

const CANCELED_STATUSES = ['canceled', 'cancelled', 'failed', 'expired', 'charged_back', 'chargeback'];

interface PaymentHistoryDayCardProps {
    date: string;
    payments: MolliePayment[];
    onPreviewInvoice: (payment: MolliePayment) => void;
    onDownloadInvoice: (payment: MolliePayment) => void;
}

export const PaymentHistoryDayCard = memo((props: PaymentHistoryDayCardProps) => {
    const { date, payments, onPreviewInvoice, onDownloadInvoice } = props;
    const { t } = useTranslation();

    return (
        <Card padding="16" fullWidth className={s.historyCard}>
            <VStack max gap="16">
                <span className={s.historyDate}>{date}</span>
                {payments.map((payment) => (
                    <div className={s.paymentRow} key={payment.id ?? payment.mollieId}>
                        <div className={s.paymentMain}>
                            <span className={s.paymentDescription}>
                                {payment.description || payment.mollieId || 'Mollie payment'}
                            </span>
                            <span className={s.paymentMeta}>
                                {payment.method || '—'} · {payment.mollieId || 'без Mollie ID'}
                            </span>
                        </div>
                        <span className={s.paymentAmount}>{formatAmount(payment)}</span>
                        <span
                            className={classNames(s.paymentStatus, {
                                [s.paid]: payment.status === 'paid',
                                [s.canceled]: CANCELED_STATUSES.includes(payment.status ?? ''),
                            }, [])}
                        >
                            {paymentStatusLabel[payment.status ?? ''] || payment.status || 'unknown'}
                        </span>
                        {payment.id && (
                            <div className={s.paymentActions}>
                                <button type="button" onClick={() => onPreviewInvoice(payment)}>{t('Просмотр')}</button>
                                <button type="button" onClick={() => onDownloadInvoice(payment)}>{t('Скачать')}</button>
                            </div>
                        )}
                    </div>
                ))}
            </VStack>
        </Card>
    );
});
