import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { listPersonOrders, PersonOrder, orderTone } from '@/entities/Order';
import { formatDate } from '@/shared/lib/format/date';
import { useResource } from '@/shared/lib/useResource/useResource';
import { classNames } from '@/shared/lib/classNames/classNames';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import { Badge } from '@/shared/ui/Badge';
import { OrderDetails } from './OrderDetails';
import { useMoney, useStatus } from '../../../model/useOrderText';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from './PersonOrders.module.scss';

const OrderCard = memo(({ order }: { order: PersonOrder }) => {
    const { t } = useTranslation();
    const money = useMoney(order.currency);
    const status = useStatus();
    return (
        <details className={own.order}>
            <summary className={own.summary}>
                <time className={own.date}>{formatDate(order.orderedAt)}</time>
                <span className={own.event}>{order.event?.name ?? '—'}</span>
                <span className={own.count}>
                    {t('Tickets: {{count}}', { count: order.tickets.length })}
                </span>
                <span className={own.total}>{money(order.total)}</span>
                <Badge tone={orderTone(order.status)} className={own.status}>
                    {status(order.status)}
                </Badge>
                {!order.boughtByPerson && (
                    <span className={classNames(cls.muted, {}, [own.note])}>
                        {t('Bought by someone else')}
                    </span>
                )}
            </summary>
            <div className={own.body}>
                <OrderDetails order={order} />
            </div>
        </details>
    );
});

// Everything the person bought, with each order opened in place like the order page of the ticket shop.
export const PersonOrders = memo(({ personId }: { personId: string }) => {
    const { t } = useTranslation();
    const load = useCallback(() => listPersonOrders(personId), [personId]);
    const orders = useResource(load);
    return (
        <Panel aria-label={t('Purchases')}>
            <h2>{t('Purchases')}</h2>
            <RequestState error={orders.error} loading={orders.loading} />
            {orders.data?.map((order) => (
                <OrderCard key={order.id} order={order} />
            ))}
            {orders.data?.length === 0 && <p className={cls.muted}>{t('No purchases yet')}</p>}
        </Panel>
    );
});
