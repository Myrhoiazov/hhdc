import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { EventSales, getEventSales } from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { RequestState, useNumbers } from './common';
import { Bar, chartStyles as own, Tile } from './Charts';
import cls from './CrmPage.module.scss';

const useFormat = (currency: string) => {
    const { i18n } = useTranslation();
    const numbers = useNumbers(currency);
    const months = new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric', timeZone: 'UTC' });
    return {
        ...numbers,
        // "2026-05" → "May 2026" in the language of the interface.
        month: (value: string) => months.format(new Date(`${value}-01T00:00:00Z`)),
    };
};

const Totals = memo(({ sales }: { sales: EventSales }) => {
    const format = useFormat(sales.currency);
    return <div className={own.tiles}>
        <Tile label="Ticket revenue">{format.rounded(sales.revenue)}</Tile>
        <Tile label="Tickets sold">{format.count(sales.tickets)}</Tile>
        <Tile label="Orders">{format.count(sales.orders)}</Tile>
        <Tile label="Buyers">{format.count(sales.buyers)}</Tile>
        <Tile label="Discounts given">{format.rounded(sales.discount)}</Tile>
        <Tile label="Cancelled, refunded or transferred">{format.count(sales.withdrawn)}</Tile>
    </div>;
});

// One line of a chart: the bar shows `amount` against the largest amount of the chart.
interface ChartLine { name: string; tickets: number; amount: string }
interface ChartProps { title: string; nameLabel: string; amountLabel: string; lines: ChartLine[]; currency: string }

const BarChart = memo(({ title, nameLabel, amountLabel, lines, currency }: ChartProps) => {
    const { t } = useTranslation();
    const format = useFormat(currency);
    const largest = Math.max(0, ...lines.map(line => Number(line.amount)));
    if (!lines.length) return null;
    return <section className={cls.panel} aria-label={t(title)}>
        <h3>{t(title)}</h3>
        <div role="table" aria-label={t(title)}>
            <div className={`${own.barRow} ${own.columnHead}`} role="row">
                <span role="columnheader">{t(nameLabel)}</span><span role="columnheader" />
                <span role="columnheader" className={own.number}>{t('Tickets')}</span><span role="columnheader" className={own.number}>{t(amountLabel)}</span>
            </div>
            {lines.map(line => <div className={own.barRow} role="row" key={line.name}>
                <span role="cell" className={own.barName}>{line.name}</span>
                <Bar value={Number(line.amount)} largest={largest} title={`${line.name}: ${format.money(line.amount)}`} />
                <span role="cell" className={`${own.number} ${own.secondary}`}>{format.count(line.tickets)}</span>
                <span role="cell" className={own.number}>{format.money(line.amount)}</span>
            </div>)}
        </div>
    </section>;
});

const SalesReport = memo(({ sales }: { sales: EventSales }) => {
    const { t } = useTranslation();
    const format = useFormat(sales.currency);
    const byType = sales.byType.map(line => ({ name: line.name, tickets: line.tickets, amount: line.revenue }));
    const byMonth = sales.byMonth.map(line => ({ name: format.month(line.name), tickets: line.tickets, amount: line.revenue }));
    const coupons = sales.coupons.map(line => ({ name: line.name, tickets: line.tickets, amount: line.discount }));
    return <>
        <Totals sales={sales} />
        <p className={cls.muted}>{t('Ticket revenue is the price of the tickets without the service fee of the ticket shop.')}</p>
        <div className={own.split}>
            <BarChart title="By ticket type" nameLabel="Ticket type" amountLabel="Income" lines={byType} currency={sales.currency} />
            <BarChart title="By month of sale" nameLabel="Month" amountLabel="Income" lines={byMonth} currency={sales.currency} />
            <BarChart title="Coupons" nameLabel="Coupon" amountLabel="Discount" lines={coupons} currency={sales.currency} />
        </div>
    </>;
});

// Sales of the event as the CRM holds them after the last sync with the ticket shop.
export const EventSalesPanel = memo(({ eventId }: { eventId: string }) => {
    const { t } = useTranslation();
    const load = useCallback(() => getEventSales(eventId), [eventId]);
    const sales = useResource(load);
    const hasSales = Boolean(sales.data && sales.data.tickets + sales.data.withdrawn > 0);
    return <section id="event-sales" className={own.report} aria-label={t('Ticket sales')}><h2>{t('Ticket sales')}</h2>
        <RequestState error={sales.error} loading={sales.loading} />
        {sales.data && hasSales && <SalesReport sales={sales.data} />}
        {sales.data && !hasSales && <p className={`${cls.panel} ${cls.muted}`}>{t('No tickets sold yet')}</p>}
    </section>;
});
