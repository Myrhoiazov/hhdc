import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LedgerCategoryTotal } from '@/entities/Finance';
import { Bar } from '@/shared/ui/Chart';
import { listStyles as table } from '@/shared/ui/ListTable';
import own from './FinanceLedger.module.scss';
import { useLedgerText } from '../model/useLedgerText';

interface CategoriesProps {
    totals: LedgerCategoryTotal[];
    currency: string;
    onOpen: (category: string) => void;
}

// The same operations added up by category; a category opens its operations.
export const CategoriesTable = memo(({ totals, currency, onOpen }: CategoriesProps) => {
    const { t } = useTranslation();
    const text = useLedgerText(currency);
    const largest = Math.max(0, ...totals.map((total) => Number(total.amount)));
    return (
        <div className={table.tableScroll}>
            <table className={table.table}>
                <thead>
                    <tr>
                        <th>{t('Category')}</th>
                        <th aria-label={t('Share')} />
                        <th className={table.number}>{t('Operations')}</th>
                        <th className={table.number}>{t('Amount')}</th>
                    </tr>
                </thead>
                <tbody>
                    {totals.map((total) => (
                        <tr key={total.category}>
                            <td>
                                <button
                                    type="button"
                                    className={own.categoryLink}
                                    onClick={() => onOpen(total.category)}
                                >
                                    {text.category(total.category)}
                                </button>
                            </td>
                            <td className={own.barCell}>
                                <Bar
                                    value={Number(total.amount)}
                                    largest={largest}
                                    title={`${text.category(total.category)}: ${text.money(total.amount)}`}
                                />
                            </td>
                            <td className={`${table.number} ${table.secondary}`}>
                                {total.operations}
                            </td>
                            <td
                                className={`${table.number} ${own[total.direction === 'IN' ? 'amountIn' : 'amountOut']}`}
                            >
                                {text.signed(total.amount, total.direction)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});
