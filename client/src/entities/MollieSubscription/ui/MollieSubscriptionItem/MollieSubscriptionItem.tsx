import { memo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './MollieSubscriptionItem.module.scss';
import { Card } from '@/shared/ui/Card/Card';
import { MollieSubscription } from '../../model/types/MollieSubscription';

interface MollieSubscriptionItemProps {
    className?: string;
    item: MollieSubscription;
    renderAction?: (client: MollieSubscription) => ReactNode;
}

const MollieSubscriptionItem = ({ className, item, renderAction }: MollieSubscriptionItemProps) => {
    const { t } = useTranslation();
    const startDate = item.startDate ? new Date(item.startDate).toLocaleDateString('nl-NL') : '—';
    const nextPaymentDate = item.nextPaymentDate ? new Date(item.nextPaymentDate).toLocaleDateString('nl-NL') : '—';
    const amount = item.amount?.value && item.amount?.currency
        ? `${item.amount.value} ${item.amount.currency}`
        : '—';

    return (
        <Card
            padding="16"
            fullWidth
            shadow="shadowLight"
            className={classNames(s.MollieSubscriptionItem, {}, [className])}
        >
            <div className={s.row}>
                <div className={s.main}>
                    <span className={s.id}>{item.id}</span>
                    <span className={s.meta}>{item.description || item.method || '—'} · {amount} · {item.interval || '—'}</span>
                </div>
                <span className={s.date}>{t('Старт: {{startDate}} · следующая: {{nextPaymentDate}} · изменена: {{updatedDate}}', { startDate, nextPaymentDate, updatedDate: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('nl-NL') : '—' })}</span>
                <span className={classNames(s.status, { [s.active]: item.status === 'active' }, [])}>
                    {item.status || 'unknown'}
                </span>
                {renderAction?.(item)}
            </div>
        </Card>
    );
};

export default memo(MollieSubscriptionItem);
