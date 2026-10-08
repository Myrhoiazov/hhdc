import { memo, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CountryRow, DashboardInsights, EventMoney, getDashboardInsights, YearMoney } from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Bar, chartStyles as chart, Tile } from './Charts';
import { RequestState } from './common';
import { listStyles as table } from './ListTable';
import cls from './CrmPage.module.scss';
import own from './DashboardInsights.module.scss';

const COUNTRIES_SHOWN = 12;

const useFormat = (currency: string) => {
    const { i18n } = useTranslation();
    const whole = new Intl.NumberFormat(i18n.language, { style: 'currency', currency, maximumFractionDigits: 0 });
    const regions = new Intl.DisplayNames([i18n.language], { type: 'region' });
    return {
        money: (amount: string) => whole.format(Number(amount)),
        count: (value: number) => new Intl.NumberFormat(i18n.language).format(value),
        country: (code: string) => regions.of(code) ?? code,
    };
};

const Totals = memo(({ data }: { data: DashboardInsights }) => {
    const format = useFormat(data.currency);
    return <div className={chart.tiles}>
        <Tile label="Ticket income">{format.money(data.totals.revenue)}</Tile>
        <Tile label="Costs recorded">{format.money(data.totals.costs)}</Tile>
        <Tile label="Result">{format.money(data.totals.result)}</Tile>
        <Tile label="Tickets sold">{format.count(data.totals.tickets)}</Tile>
        <Tile label="Buyers">{format.count(data.totals.buyers)}</Tile>
    </div>;
});

const Figure = memo(({ label, children }: { label: string; children: ReactNode }) => {
    const { t } = useTranslation();
    return <span className={own.figure}><small>{t(label)}</small>{children}</span>;
});

const EventRows = memo(({ events, currency }: { events: EventMoney[]; currency: string }) => {
    const { t } = useTranslation();
    const format = useFormat(currency);
    return <div className={table.tableScroll}><table className={table.table}>
        <thead><tr>
            <th>{t('Event')}</th><th className={table.optional}>{t('Date')}</th><th className={table.number}>{t('Tickets')}</th><th className={table.number}>{t('Income')}</th>
            <th className={`${table.number} ${table.optional}`}>{t('Discounts')}</th><th className={table.number}>{t('Costs')}</th><th className={table.number}>{t('Result')}</th>
        </tr></thead>
        <tbody>{events.map(event => <tr key={event.id}>
            <td><Link className={table.name} to={`/events/${event.id}`}>{event.name}</Link></td>
            <td className={`${table.secondary} ${table.optional}`}>{new Date(event.startAt).toLocaleDateString()}</td>
            <td className={table.number}>{format.count(event.tickets)}</td>
            <td className={table.number}>{format.money(event.revenue)}</td>
            <td className={`${table.number} ${table.optional}`}>{format.money(event.discount)}</td>
            <td className={table.number}>{format.money(event.costs)}</td>
            <td className={table.number}>{format.money(event.result)}</td>
        </tr>)}</tbody>
    </table></div>;
});

const YearBlock = memo(({ year, largest, currency, open }: { year: YearMoney; largest: number; currency: string; open: boolean }) => {
    const { t } = useTranslation();
    const format = useFormat(currency);
    return <details className={own.year} open={open}>
        <summary className={own.yearSummary}>
            <span><span className={own.yearName}>{year.year}</span> <span className={chart.secondary}>· {t('Events: {{count}}', { count: year.events.length })}</span></span>
            <Bar className={own.wideBar} value={Number(year.revenue)} largest={largest} title={`${year.year}: ${format.money(year.revenue)}`} />
            <Figure label="Income">{format.money(year.revenue)}</Figure>
            <Figure label="Costs">{format.money(year.costs)}</Figure>
            <Figure label="Result">{format.money(year.result)}</Figure>
        </summary>
        <EventRows events={year.events} currency={currency} />
    </details>;
});

const Years = memo(({ data }: { data: DashboardInsights }) => {
    const { t } = useTranslation();
    const largest = Math.max(0, ...data.years.map(year => Number(year.revenue)));
    const noCosts = Number(data.totals.costs) === 0;
    return <section className={cls.panel} aria-label={t('Income and costs by year')}>
        <h2>{t('Income and costs by year')}</h2>
        <p className={cls.muted}>{t('Income is the price of the tickets sold, without the service fee of the ticket shop. Costs are the expenses entered on events plus the expenses and agreed fees recorded for choreographers.')}</p>
        {noCosts && <p className={cls.muted}>{t("No costs are recorded yet, so the result equals the income. Add expenses on the page of an event to see them here.")}</p>}
        <div>{data.years.map((year, index) => <YearBlock key={year.year} year={year} largest={largest} currency={data.currency} open={index === 0} />)}</div>
    </section>;
});

// The countries after the first dozen are added up into one line, so the list stays readable.
const foldCountries = (countries: CountryRow[]): { shown: CountryRow[]; rest: CountryRow | null; restCount: number } => {
    const tail = countries.slice(COUNTRIES_SHOWN);
    const rest = tail.length ? {
        code: '', buyers: tail.reduce((sum, row) => sum + row.buyers, 0), tickets: tail.reduce((sum, row) => sum + row.tickets, 0),
        revenue: tail.reduce((sum, row) => sum + Number(row.revenue), 0).toFixed(2),
    } : null;
    return { shown: countries.slice(0, COUNTRIES_SHOWN), rest, restCount: tail.length };
};

interface CountryLineProps { name: string; row: CountryRow; largest: number; currency: string }

const CountryLine = memo(({ name, row, largest, currency }: CountryLineProps) => {
    const format = useFormat(currency);
    return <div className={own.countryRow} role="row">
        <span role="cell">{name}</span>
        <Bar className={own.wideBar} value={row.buyers} largest={largest} title={`${name}: ${format.count(row.buyers)}`} />
        <span role="cell" className={chart.number}>{format.count(row.buyers)}</span>
        <span role="cell" className={`${chart.number} ${chart.secondary} ${own.optional}`}>{format.count(row.tickets)}</span>
        <span role="cell" className={`${chart.number} ${own.optional}`}>{format.money(row.revenue)}</span>
    </div>;
});

const Countries = memo(({ data }: { data: DashboardInsights }) => {
    const { t } = useTranslation();
    const format = useFormat(data.currency);
    const { shown, rest, restCount } = foldCountries(data.countries);
    const largest = Math.max(0, ...shown.map(row => row.buyers));
    return <section className={cls.panel} aria-label={t('Buyers by country')}>
        <h2>{t('Buyers by country')}</h2>
        <div role="table" aria-label={t('Buyers by country')}>
            <div className={`${own.countryRow} ${chart.columnHead}`} role="row">
                <span role="columnheader">{t('Country')}</span><span role="columnheader">{t('Share of buyers')}</span><span role="columnheader" className={chart.number}>{t('Buyers')}</span>
                <span role="columnheader" className={`${chart.number} ${own.optional}`}>{t('Tickets')}</span><span role="columnheader" className={`${chart.number} ${own.optional}`}>{t('Income')}</span>
            </div>
            {shown.map(row => <CountryLine key={row.code} name={format.country(row.code)} row={row} largest={largest} currency={data.currency} />)}
            {rest && <CountryLine name={t('Other countries: {{count}}', { count: restCount })} row={rest} largest={largest} currency={data.currency} />}
        </div>
        <p className={cls.muted}>{t('Country not given: {{notGiven}} buyers. Country not recognised: {{notRecognised}} buyers.', { notGiven: data.notGiven, notRecognised: data.notRecognised })} {t('Countries are typed by buyers at checkout; the same country in different languages is counted as one.')}</p>
    </section>;
});

// What the events earned and cost, by year and event, and where the buyers come from.
export const DashboardInsightsPanel = memo(() => {
    const { t } = useTranslation();
    const insights = useResource(getDashboardInsights);
    return <>
        <h2>{t('Money of the events')}</h2>
        <RequestState error={insights.error} loading={insights.loading && !insights.data} />
        {insights.data && <><Totals data={insights.data} /><Years data={insights.data} /><Countries data={insights.data} /></>}
    </>;
});
