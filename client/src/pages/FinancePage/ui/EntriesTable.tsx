import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LedgerEntry, canRefund, paymentIdOf } from '@/entities/Finance';
import { formatDate } from '@/shared/lib/format/date';
import { Button } from '@/shared/ui/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Badge } from '@/shared/ui/Badge';
import { RefundRequestForm } from './RefundRequestForm';
import { listStyles as table } from '@/shared/ui/ListTable';
import own from './FinanceLedger.module.scss';
import { useLedgerText } from '../model/useLedgerText';

const COLUMNS = 8;

const NamedLink = memo(
    ({ to, named }: { to: string; named: { id: string; name: string } | null }) =>
        named ? (
            <Link className={table.name} to={`${to}/${named.id}`}>
                {named.name}
            </Link>
        ) : (
            <span className={table.secondary}>—</span>
        )
);

// What the operation is about, and — when the buyer paid more than the tickets cost — how much
// they paid: the fees of the shop and of the payment method come on top of the income.
const EntryDescription = memo(({ entry }: { entry: LedgerEntry }) => {
    const { t } = useTranslation();
    const text = useLedgerText(entry.currency);
    const paid =
        entry.paidAmount && entry.paidAmount !== entry.amount
            ? ` · ${t('paid {{amount}}', { amount: text.money(entry.paidAmount) })}`
            : '';
    return (
        <>
            {entry.description || '—'}
            {paid}
        </>
    );
});

const EntryAmount = memo(({ entry }: { entry: LedgerEntry }) => {
    const { t } = useTranslation();
    const text = useLedgerText(entry.currency);
    const signed = text.signed(entry.amount, entry.direction);
    if (!entry.counted)
        return (
            <span className={own.uncounted} title={t('Not counted in the totals')}>
                {signed}
            </span>
        );
    return (
        <span className={own[entry.direction === 'IN' ? 'amountIn' : 'amountOut']}>{signed}</span>
    );
});

const EntryRow = memo(({ entry, onRefunded }: { entry: LedgerEntry; onRefunded: () => void }) => {
    const { t } = useTranslation();
    const [refunding, setRefunding] = useState(false);
    const text = useLedgerText(entry.currency);
    const done = () => {
        setRefunding(false);
        onRefunded();
    };
    return (
        <>
            <tr>
                <td className={table.secondary}>
                    <time dateTime={entry.date}>{formatDate(entry.date)}</time>
                </td>
                <td>
                    <Badge>{text.category(entry.category)}</Badge>
                </td>
                <td>
                    <NamedLink to="/people" named={entry.person} />
                </td>
                <td className={table.optional}>
                    <NamedLink to="/events" named={entry.event} />
                </td>
                <td className={`${table.secondary} ${table.optional}`}>
                    <EntryDescription entry={entry} />
                </td>
                <td>
                    <StatusBadge status={entry.status} />
                </td>
                <td className={table.number}>
                    <EntryAmount entry={entry} />
                </td>
                <td>
                    {canRefund(entry) && (
                        <Button aria-expanded={refunding} onClick={() => setRefunding(!refunding)}>
                            {t('Refund')}
                        </Button>
                    )}
                </td>
            </tr>
            {refunding && (
                <tr>
                    <td colSpan={COLUMNS}>
                        <RefundRequestForm
                            paymentId={paymentIdOf(entry)}
                            amount={entry.paidAmount ?? entry.amount}
                            onDone={done}
                        />
                    </td>
                </tr>
            )}
        </>
    );
});

export const EntriesTable = memo(
    ({ entries, onRefunded }: { entries: LedgerEntry[]; onRefunded: () => void }) => {
        const { t } = useTranslation();
        return (
            <div className={table.tableScroll}>
                <table className={table.table}>
                    <thead>
                        <tr>
                            <th>{t('Date')}</th>
                            <th>{t('Category')}</th>
                            <th>{t('Person')}</th>
                            <th className={table.optional}>{t('Event')}</th>
                            <th className={table.optional}>{t('Description')}</th>
                            <th>{t('Status')}</th>
                            <th className={table.number}>{t('Amount')}</th>
                            <th aria-label={t('Actions')} />
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((entry) => (
                            <EntryRow key={entry.id} entry={entry} onRefunded={onRefunded} />
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }
);
