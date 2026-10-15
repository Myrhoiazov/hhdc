import { memo } from 'react';
import { LedgerSummary } from '@/entities/Finance';
import { chartStyles, Tile } from '@/shared/ui/Chart';
import { useLedgerText } from '../model/useLedgerText';

export const LedgerTiles = memo(({ summary }: { summary: LedgerSummary }) => {
    const text = useLedgerText(summary.currency);
    return (
        <div className={chartStyles.tiles}>
            <Tile label="Ticket income">{text.rounded(summary.income)}</Tile>
            <Tile label="Refunded">{text.rounded(summary.refunds)}</Tile>
            <Tile label="Costs recorded">{text.rounded(summary.expenses)}</Tile>
            <Tile label="Of them not paid yet">{text.rounded(summary.planned)}</Tile>
            <Tile label="Result">{text.rounded(summary.result)}</Tile>
        </div>
    );
});
