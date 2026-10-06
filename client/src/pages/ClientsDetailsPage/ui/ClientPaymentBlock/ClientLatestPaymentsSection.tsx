import { memo } from 'react';
import { Text } from '@/shared/ui/Text/Text';
import type { ClientPayment } from './types';
import { formatAmount, formatDate, getPayerName, issueStatuses } from './helpers';
import s from './ClientPaymentBlock.module.scss';

interface ClientLatestPaymentsSectionProps {
    latestPayments?: ClientPayment[];
}

export const ClientLatestPaymentsSection = memo((props: ClientLatestPaymentsSectionProps) => {
    const { latestPayments } = props;

    return (
        <div className={s.section}>
            <Text title="Последние платежи" size="s" bold />
            {latestPayments?.length ? latestPayments.map((payment) => (
                <div className={s.row} key={payment.id}>
                    <div className={s.rowMain}>
                        <span className={s.primaryText}>{payment.description || payment.mollieId || `Payment #${payment.id}`}</span>
                        <span>{getPayerName(payment.customer)} · {payment.method || 'unknown'}</span>
                    </div>
                    <span className={issueStatuses.includes(payment.status) ? s.issueText : ''}>
                        {formatAmount(payment.amountValue, payment.amountCurrency)} · {payment.status} · {formatDate(payment.paidAt || payment.createdAt)}
                    </span>
                </div>
            )) : (
                <Text text="Платежей пока не найдено." size="s" />
            )}
        </div>
    );
});
