import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { EventSales } from '@/entities/Event';
import { Panel } from '@/shared/ui/Panel';
import { Bar, chartStyles as own, Tile } from '@/shared/ui/Chart';
import { useFormat } from '../../../model/useSalesFormat';

export const Totals = memo(({ sales }: { sales: EventSales }) => {
    const format = useFormat(sales.currency);
    return (
        <div className={own.tiles}>
            <Tile label="Ticket revenue">{format.rounded(sales.revenue)}</Tile>
            <Tile label="Tickets sold">{format.count(sales.tickets)}</Tile>
            <Tile label="Orders">{format.count(sales.orders)}</Tile>
            <Tile label="Buyers">{format.count(sales.buyers)}</Tile>
            <Tile label="Discounts given">{format.rounded(sales.discount)}</Tile>
            <Tile label="Cancelled, refunded or transferred">{format.count(sales.withdrawn)}</Tile>
        </div>
    );
});

// One line of a chart: the bar shows `amount` against the largest amount of the chart.
interface ChartLine {
    name: string;
    tickets: number;
    amount: string;
}

interface ChartProps {
    title: string;
    nameLabel: string;
    amountLabel: string;
    lines: ChartLine[];
    currency: string;
}

export const BarChart = memo(({ title, nameLabel, amountLabel, lines, currency }: ChartProps) => {
    const { t } = useTranslation();
    const format = useFormat(currency);
    const largest = Math.max(0, ...lines.map((line) => Number(line.amount)));
    if (!lines.length) return null;
    return (
        <Panel aria-label={t(title)}>
            <h3>{t(title)}</h3>
            <div role="table" aria-label={t(title)}>
                <div className={`${own.barRow} ${own.columnHead}`} role="row">
                    <span role="columnheader">{t(nameLabel)}</span>
                    <span role="columnheader" />
                    <span role="columnheader" className={own.number}>
                        {t('Tickets')}
                    </span>
                    <span role="columnheader" className={own.number}>
                        {t(amountLabel)}
                    </span>
                </div>
                {lines.map((line) => (
                    <div className={own.barRow} role="row" key={line.name}>
                        <span role="cell" className={own.barName}>
                            {line.name}
                        </span>
                        <Bar
                            value={Number(line.amount)}
                            largest={largest}
                            title={`${line.name}: ${format.money(line.amount)}`}
                        />
                        <span role="cell" className={`${own.number} ${own.secondary}`}>
                            {format.count(line.tickets)}
                        </span>
                        <span role="cell" className={own.number}>
                            {format.money(line.amount)}
                        </span>
                    </div>
                ))}
            </div>
        </Panel>
    );
});
