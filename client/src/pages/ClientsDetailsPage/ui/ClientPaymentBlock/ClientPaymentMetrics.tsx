import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ClientPaymentSummary } from './types';
import { formatAmount } from './helpers';
import s from './ClientPaymentBlock.module.scss';

interface ClientPaymentMetricsProps {
    payerCount?: number;
    activeSubscriptionCount?: number;
    lastPayment?: ClientPaymentSummary['summary']['lastPayment'];
}

export const ClientPaymentMetrics = memo((props: ClientPaymentMetricsProps) => {
    const { t } = useTranslation();
    const { payerCount, activeSubscriptionCount, lastPayment } = props;

    return (
        <div className={s.metrics}>
            <div className={s.metric}>
                <span>{t('Плательщики')}</span>
                <strong>{payerCount ?? 0}</strong>
            </div>
            <div className={s.metric}>
                <span>{t('Активные подписки')}</span>
                <strong>{activeSubscriptionCount ?? 0}</strong>
            </div>
            <div className={s.metric}>
                <span>{t('Последний платеж')}</span>
                <strong>
                    {lastPayment
                        ? formatAmount(lastPayment.amountValue, lastPayment.amountCurrency)
                        : '—'}
                </strong>
            </div>
        </div>
    );
});
