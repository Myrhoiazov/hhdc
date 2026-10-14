import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { CountryRow, DashboardInsights } from '@/entities/Dashboard';
import { Panel } from '@/shared/ui/Panel';
import { Bar, chartStyles as chart } from '@/shared/ui/Chart';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from './DashboardInsights.module.scss';
import { useFormat } from '../model/useFormat';
import { foldCountries } from '../model/foldCountries';

interface CountryLineProps {
    name: string;
    row: CountryRow;
    largest: number;
    currency: string;
}

const CountryLine = memo(({ name, row, largest, currency }: CountryLineProps) => {
    const format = useFormat(currency);
    return (
        <div className={own.countryRow} role="row">
            <span role="cell">{name}</span>
            <Bar
                className={own.wideBar}
                value={row.buyers}
                largest={largest}
                title={`${name}: ${format.count(row.buyers)}`}
            />
            <span role="cell" className={chart.number}>
                {format.count(row.buyers)}
            </span>
            <span role="cell" className={`${chart.number} ${chart.secondary} ${own.optional}`}>
                {format.count(row.tickets)}
            </span>
            <span role="cell" className={`${chart.number} ${own.optional}`}>
                {format.money(row.revenue)}
            </span>
        </div>
    );
});

export const Countries = memo(({ data }: { data: DashboardInsights }) => {
    const { t } = useTranslation();
    const format = useFormat(data.currency);
    const { shown, rest, restCount } = foldCountries(data.countries);
    const largest = Math.max(0, ...shown.map((row) => row.buyers));
    return (
        <Panel aria-label={t('Buyers by country')}>
            <h2>{t('Buyers by country')}</h2>
            <div role="table" aria-label={t('Buyers by country')}>
                <div className={`${own.countryRow} ${chart.columnHead}`} role="row">
                    <span role="columnheader">{t('Country')}</span>
                    <span role="columnheader">{t('Share of buyers')}</span>
                    <span role="columnheader" className={chart.number}>
                        {t('Buyers')}
                    </span>
                    <span role="columnheader" className={`${chart.number} ${own.optional}`}>
                        {t('Tickets')}
                    </span>
                    <span role="columnheader" className={`${chart.number} ${own.optional}`}>
                        {t('Income')}
                    </span>
                </div>
                {shown.map((row) => (
                    <CountryLine
                        key={row.code}
                        name={format.country(row.code)}
                        row={row}
                        largest={largest}
                        currency={data.currency}
                    />
                ))}
                {rest && (
                    <CountryLine
                        name={t('Other countries: {{count}}', { count: restCount })}
                        row={rest}
                        largest={largest}
                        currency={data.currency}
                    />
                )}
            </div>
            <p className={cls.muted}>
                {t(
                    'Country not given: {{notGiven}} buyers. Country not recognised: {{notRecognised}} buyers.',
                    { notGiven: data.notGiven, notRecognised: data.notRecognised }
                )}{' '}
                {t(
                    'Countries are typed by buyers at checkout; the same country in different languages is counted as one.'
                )}
            </p>
        </Panel>
    );
});
