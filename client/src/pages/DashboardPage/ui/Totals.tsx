import { memo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardInsights } from '@/entities/Dashboard';
import { chartStyles as chart, Tile } from '@/shared/ui/Chart';
import own from './DashboardInsights.module.scss';
import { useFormat } from '../model/useFormat';

export const Totals = memo(({ data }: { data: DashboardInsights }) => {
    const format = useFormat(data.currency);
    return (
        <div className={chart.tiles}>
            <Tile label="Ticket income">{format.money(data.totals.revenue)}</Tile>
            <Tile label="Costs recorded">{format.money(data.totals.costs)}</Tile>
            <Tile label="Result">{format.money(data.totals.result)}</Tile>
            <Tile label="Tickets sold">{format.count(data.totals.tickets)}</Tile>
            <Tile label="Buyers">{format.count(data.totals.buyers)}</Tile>
        </div>
    );
});

export const Figure = memo(({ label, children }: { label: string; children: ReactNode }) => {
    const { t } = useTranslation();
    return (
        <span className={own.figure}>
            <small>{t(label)}</small>
            {children}
        </span>
    );
});
