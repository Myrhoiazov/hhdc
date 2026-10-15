import { memo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CurrencyTotals } from '@/entities/Choreographer';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from '../Choreographers.module.scss';

export const money = (amount: string | null, currency: string) =>
    amount === null ? '—' : `${amount} ${currency}`;

// One row per currency: nothing is ever summed across currencies.
export const TotalsTable = memo(({ totals }: { totals: CurrencyTotals[] }) => {
    const { t } = useTranslation();
    if (!totals.length) return <p className={cls.muted}>{t('No financial records yet.')}</p>;
    return (
        <div className={own.tableScroll}>
            <table className={own.table}>
                <thead>
                    <tr>
                        <th>{t('Agreed fee')}</th>
                        <th>{t('Expenses, planned')}</th>
                        <th>{t('Expenses, actual')}</th>
                        <th>{t('Payments confirmed')}</th>
                        <th>{t('Fee outstanding')}</th>
                        <th>{t('Organizer total cost')}</th>
                    </tr>
                </thead>
                <tbody>
                    {totals.map((row) => (
                        <tr key={row.currency}>
                            <td>{money(row.agreedFee, row.currency)}</td>
                            <td>{money(row.estimatedExpenses, row.currency)}</td>
                            <td>{money(row.actualExpenses, row.currency)}</td>
                            <td>{money(row.confirmedPayments, row.currency)}</td>
                            <td>{money(row.outstandingFee, row.currency)}</td>
                            <td>{money(row.organizerTotalCost, row.currency)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});

export const LedgerRow = memo(
    ({
        title,
        detail,
        status,
        children,
    }: {
        title: string;
        detail: string;
        status: string;
        children?: ReactNode;
    }) => (
        <div className={cls.row}>
            <span>
                <strong>{title}</strong>
                <div className={own.secondary}>{detail}</div>
            </span>
            <span className={cls.actions}>
                <StatusBadge status={status} />
                {children}
            </span>
        </div>
    )
);
