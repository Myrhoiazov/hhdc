import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { EventSales, getEventSales } from '@/entities/Event';
import { useResource } from '@/shared/lib/useResource/useResource';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import { chartStyles as own } from '@/shared/ui/Chart';
import cls from '@/shared/ui/layout/layout.module.scss';
import { useFormat } from '../../../model/useSalesFormat';
import { Totals, BarChart } from './SalesCharts';

const SalesReport = memo(({ sales }: { sales: EventSales }) => {
    const { t } = useTranslation();
    const format = useFormat(sales.currency);
    const byType = sales.byType.map((line) => ({
        name: line.name,
        tickets: line.tickets,
        amount: line.revenue,
    }));
    const byMonth = sales.byMonth.map((line) => ({
        name: format.month(line.name),
        tickets: line.tickets,
        amount: line.revenue,
    }));
    const coupons = sales.coupons.map((line) => ({
        name: line.name,
        tickets: line.tickets,
        amount: line.discount,
    }));
    return (
        <>
            <Totals sales={sales} />
            <p className={cls.muted}>
                {t(
                    'Ticket revenue is the price of the tickets without the service fee of the ticket shop.'
                )}
            </p>
            <div className={own.split}>
                <BarChart
                    title="By ticket type"
                    nameLabel="Ticket type"
                    amountLabel="Income"
                    lines={byType}
                    currency={sales.currency}
                />
                <BarChart
                    title="By month of sale"
                    nameLabel="Month"
                    amountLabel="Income"
                    lines={byMonth}
                    currency={sales.currency}
                />
                <BarChart
                    title="Coupons"
                    nameLabel="Coupon"
                    amountLabel="Discount"
                    lines={coupons}
                    currency={sales.currency}
                />
            </div>
        </>
    );
});

// Sales of the event as the CRM holds them after the last sync with the ticket shop.
export const EventSalesPanel = memo(({ eventId }: { eventId: string }) => {
    const { t } = useTranslation();
    const load = useCallback(() => getEventSales(eventId), [eventId]);
    const sales = useResource(load);
    const hasSales = Boolean(sales.data && sales.data.tickets + sales.data.withdrawn > 0);
    return (
        <section id="event-sales" className={own.report} aria-label={t('Ticket sales')}>
            <h2>{t('Ticket sales')}</h2>
            <RequestState error={sales.error} loading={sales.loading} />
            {sales.data && hasSales && <SalesReport sales={sales.data} />}
            {sales.data && !hasSales && (
                <Panel as="p" className={cls.muted}>
                    {t('No tickets sold yet')}
                </Panel>
            )}
        </section>
    );
});
