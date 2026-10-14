import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    cancelChoreographerExpense,
    cancelFeeAgreement,
    ChoreographerExpense,
    FeeAgreement,
    movePayout,
    PayoutRecord,
    payoutActions,
    PayoutRights,
} from '@/entities/Choreographer';
import { formatDate } from '@/shared/lib/format/date';
import { Button } from '@/shared/ui/Button';
import type { ActionRun as Run } from '@/shared/lib/useResource/useAction';
import { money, LedgerRow } from './FinanceTotals';

export const Agreements = memo(
    ({ items, rights, run }: { items: FeeAgreement[]; rights: PayoutRights; run: Run }) => {
        const { t } = useTranslation();
        return (
            <>
                {items.map((item) => (
                    <LedgerRow
                        key={item.id}
                        title={money(item.amount, item.currency)}
                        status={item.status}
                        detail={[formatDate(item.createdAt), item.notes]
                            .filter(Boolean)
                            .join(' · ')}
                    >
                        {rights.canWrite &&
                            ['PROPOSED', 'COUNTERED', 'AGREED'].includes(item.status) && (
                                <Button
                                    aria-label={`${t('Cancel entry')}: ${money(item.amount, item.currency)}`}
                                    onClick={() => void run(() => cancelFeeAgreement(item.id))}
                                >
                                    {t('Cancel entry')}
                                </Button>
                            )}
                    </LedgerRow>
                ))}
            </>
        );
    }
);

const expenseDetail = (item: ChoreographerExpense, t: (key: string) => string) =>
    [
        item.estimatedAmount !== null
            ? `${t('planned')} ${money(item.estimatedAmount, item.currency)}`
            : '',
        `${t('Paid by')}: ${t(`PAYER_${item.paidBy}`)}`,
        item.reimbursable ? t('reimbursable') : '',
        item.description,
    ]
        .filter(Boolean)
        .join(' · ');

export const Expenses = memo(
    ({ items, rights, run }: { items: ChoreographerExpense[]; rights: PayoutRights; run: Run }) => {
        const { t } = useTranslation();
        return (
            <>
                {items.map((item) => (
                    <LedgerRow
                        key={item.id}
                        status={item.status}
                        detail={expenseDetail(item, t)}
                        title={`${t(`EXPENSE_${item.type}`)}: ${money(item.actualAmount ?? item.estimatedAmount, item.currency)}`}
                    >
                        {rights.canWrite && item.status !== 'CANCELLED' && (
                            <Button
                                onClick={() => void run(() => cancelChoreographerExpense(item.id))}
                            >
                                {t('Cancel entry')}
                            </Button>
                        )}
                    </LedgerRow>
                ))}
            </>
        );
    }
);

// What a payment may become next, and who may do it: confirming needs its own permission.
export const Payments = memo(
    ({ items, rights, run }: { items: PayoutRecord[]; rights: PayoutRights; run: Run }) => {
        const { t } = useTranslation();
        return (
            <>
                {items.map((item) => (
                    <LedgerRow
                        key={item.id}
                        status={item.status}
                        title={`${t(`PAYOUT_${item.type}`)}: ${money(item.amount, item.currency)}`}
                        detail={[
                            item.paymentDate ? formatDate(item.paymentDate) : '',
                            item.reference,
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    >
                        {payoutActions(item.status, rights).map((target) => (
                            <Button
                                key={target}
                                aria-label={`${t(`MOVE_${target}`)}: ${money(item.amount, item.currency)}`}
                                onClick={() => void run(() => movePayout(item.id, target))}
                            >
                                {t(`MOVE_${target}`)}
                            </Button>
                        ))}
                    </LedgerRow>
                ))}
            </>
        );
    }
);
