import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import cls from '@/shared/ui/layout/layout.module.scss';
import { useExpenseText } from '../../lib/useExpenseText';
import { ExpenseList } from '../../model/types';
import own from './ExpenseTotals.module.scss';

// What a list of expenses adds up to: the total, what is paid and what is still to pay, and the
// sum of each category.
export const ExpenseTotals = memo(({ totals }: { totals: ExpenseList['totals'] }) => {
    const { t } = useTranslation();
    const text = useExpenseText();
    const sums = {
        total: text.money(totals.total),
        paid: text.money(totals.paid),
        planned: text.money(totals.planned),
    };
    return (
        <div className={own.ExpenseTotals}>
            <p>
                <strong>
                    {t('Total: {{total}} · paid: {{paid}} · still to pay: {{planned}}', sums)}
                </strong>
            </p>
            {totals.byCategory.length > 0 && (
                <p className={cls.muted}>
                    {totals.byCategory
                        .map(
                            (item) => `${text.category(item.category)}: ${text.money(item.amount)}`
                        )
                        .join(' · ')}
                </p>
            )}
        </div>
    );
});
