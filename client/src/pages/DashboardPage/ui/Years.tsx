import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DashboardInsights, EventMoney, YearMoney } from '@/entities/Dashboard';
import { formatDate } from '@/shared/lib/format/date';
import { Panel } from '@/shared/ui/Panel';
import { Bar, chartStyles as chart } from '@/shared/ui/Chart';
import { listStyles as table } from '@/shared/ui/ListTable';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from './DashboardInsights.module.scss';
import { Figure } from './Totals';
import { useFormat } from '../model/useFormat';

const EventRows = memo(({ events, currency }: { events: EventMoney[]; currency: string }) => {
    const { t } = useTranslation();
    const format = useFormat(currency);
    return (
        <div className={table.tableScroll}>
            <table className={table.table}>
                <thead>
                    <tr>
                        <th>{t('Event')}</th>
                        <th className={table.optional}>{t('Date')}</th>
                        <th className={table.number}>{t('Tickets')}</th>
                        <th className={table.number}>{t('Income')}</th>
                        <th className={`${table.number} ${table.optional}`}>{t('Discounts')}</th>
                        <th className={table.number}>{t('Costs')}</th>
                        <th className={table.number}>{t('Result')}</th>
                    </tr>
                </thead>
                <tbody>
                    {events.map((event) => (
                        <tr key={event.id}>
                            <td>
                                <Link className={table.name} to={`/events/${event.id}`}>
                                    {event.name}
                                </Link>
                            </td>
                            <td className={`${table.secondary} ${table.optional}`}>
                                {formatDate(event.startAt)}
                            </td>
                            <td className={table.number}>{format.count(event.tickets)}</td>
                            <td className={table.number}>{format.money(event.revenue)}</td>
                            <td className={`${table.number} ${table.optional}`}>
                                {format.money(event.discount)}
                            </td>
                            <td className={table.number}>{format.money(event.costs)}</td>
                            <td className={table.number}>{format.money(event.result)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});

const YearBlock = memo(
    ({
        year,
        largest,
        currency,
        open,
    }: {
        year: YearMoney;
        largest: number;
        currency: string;
        open: boolean;
    }) => {
        const { t } = useTranslation();
        const format = useFormat(currency);
        return (
            <details className={own.year} open={open}>
                <summary className={own.yearSummary}>
                    <span>
                        <span className={own.yearName}>{year.year}</span>{' '}
                        <span className={chart.secondary}>
                            · {t('Events: {{count}}', { count: year.events.length })}
                        </span>
                    </span>
                    <Bar
                        className={own.wideBar}
                        value={Number(year.revenue)}
                        largest={largest}
                        title={`${year.year}: ${format.money(year.revenue)}`}
                    />
                    <Figure label="Income">{format.money(year.revenue)}</Figure>
                    <Figure label="Costs">{format.money(year.costs)}</Figure>
                    <Figure label="Result">{format.money(year.result)}</Figure>
                </summary>
                <EventRows events={year.events} currency={currency} />
            </details>
        );
    }
);

export const Years = memo(({ data }: { data: DashboardInsights }) => {
    const { t } = useTranslation();
    const largest = Math.max(0, ...data.years.map((year) => Number(year.revenue)));
    const noCosts = Number(data.totals.costs) === 0;
    return (
        <Panel aria-label={t('Income and costs by year')}>
            <h2>{t('Income and costs by year')}</h2>
            <p className={cls.muted}>
                {t(
                    'Income is the price of the tickets sold, without the service fee of the ticket shop. Costs are the expenses entered on events plus the expenses and agreed fees recorded for choreographers.'
                )}
            </p>
            {noCosts && (
                <p className={cls.muted}>
                    {t(
                        'No costs are recorded yet, so the result equals the income. Add expenses on the page of an event to see them here.'
                    )}
                </p>
            )}
            <div>
                {data.years.map((year, index) => (
                    <YearBlock
                        key={year.year}
                        year={year}
                        largest={largest}
                        currency={data.currency}
                        open={index === 0}
                    />
                ))}
            </div>
        </Panel>
    );
});
