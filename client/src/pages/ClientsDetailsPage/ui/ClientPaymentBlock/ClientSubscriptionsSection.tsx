import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text/Text';
import type { ClientSubscription } from './types';
import { formatAmount, formatDate, getPayerName, restartableSubscriptionStatuses } from './helpers';
import s from './ClientPaymentBlock.module.scss';

interface ClientSubscriptionsSectionProps {
    subscriptions?: ClientSubscription[];
    onOpenEdit: (subscription: ClientSubscription) => void;
    onCancel: (subscription: ClientSubscription) => void;
    onOpenRestart: (subscription: ClientSubscription) => void;
}

export const ClientSubscriptionsSection = memo((props: ClientSubscriptionsSectionProps) => {
    const { t } = useTranslation();
    const { subscriptions, onOpenEdit, onCancel, onOpenRestart } = props;

    return (
        <div className={s.section}>
            <Text title="Подписки" text="Активные и завершённые подписки сохраняются в истории." size="s" bold />
            {subscriptions?.length ? subscriptions.map((subscription) => (
                <div className={s.row} key={subscription.id}>
                    <div className={s.rowMain}>
                        <span className={s.primaryText}>{subscription.description || subscription.mollieId || `Subscription #${subscription.id}`}</span>
                        <span>{getPayerName(subscription.customer)} · {subscription.status} {t('· mandate {{mandateId}}', { mandateId: subscription.mandate?.mollieId || '—' })}</span>
                        <span>{t('Создана: {{createdAt}} · старт: {{startDate}} · следующая: {{nextPaymentDate}} · изменена: {{updatedAt}}', { createdAt: formatDate(subscription.createdAt), startDate: formatDate(subscription.startDate), nextPaymentDate: formatDate(subscription.nextPaymentDate), updatedAt: formatDate(subscription.updatedAt) })}</span>
                    </div>
                    <div className={s.subscriptionActions}>
                        <span>{formatAmount(subscription.amountValue, subscription.amountCurrency)} · {subscription.interval || '—'}</span>
                        {subscription.status === 'active' ? (
                            <>
                                <Button theme={ButtonTheme.OUTLINE} onClick={() => onOpenEdit(subscription)}>{t('Изменить')}</Button>
                                <Button theme={ButtonTheme.OUTLINE_RED} onClick={() => onCancel(subscription)}>{t('Остановить')}</Button>
                            </>
                        ) : restartableSubscriptionStatuses.includes(subscription.status) ? (
                            <Button theme={ButtonTheme.OUTLINE} onClick={() => onOpenRestart(subscription)}>{t('Запустить снова')}</Button>
                        ) : null}
                    </div>
                </div>
            )) : (
                <Text text="Подписок не найдено." size="s" />
            )}
        </div>
    );
});
