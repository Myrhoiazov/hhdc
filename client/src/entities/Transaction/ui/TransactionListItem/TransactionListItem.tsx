import { memo, ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './TransactionListItem.module.scss';
import { Transaction } from '../../model/types/transaction';
import { Card } from '@/shared/ui/Card/Card';
import { TransactionType } from '@/entities/TransactionType';
import { PaymentMethod } from '@/entities/PaymentMethod';

interface TransactionListItemProps {
    className?: string;
    transaction: Transaction;
    renderAction?: (appoiment: Transaction) => ReactNode;
}

const TransactionListItem = ({
    className,
    transaction,
    renderAction,
}: TransactionListItemProps) => {
    const onlyDate = new Intl.DateTimeFormat('ru-RU').format(new Date(transaction?.date as string));

    const paymentKey: string | undefined = transaction?.paymentMethod;
    const paymentMethod = paymentKey && paymentKey in PaymentMethod
        ? PaymentMethod[paymentKey as keyof typeof PaymentMethod]
        : undefined;
    const formattedAmount = new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: transaction.currency ?? 'EUR',
    }).format(Number(transaction.amount ?? 0));
    const isIncome = transaction.type === ('INCOME' as TransactionType.INCOME);
    const statusMap: Record<string, string> = {
        paid: 'Оплачено',
        completed: 'Проведено',
        charged_back: 'Chargeback',
        refunded: 'Возврат',
    };
    const operationLabel = isIncome ? 'Приход' : 'Расход';
    const sourceLabel = transaction.source === 'MOLLIE'
        ? `Mollie · ${statusMap[transaction.status ?? ''] ?? transaction.status ?? '—'}`
        : 'Ручная операция';

    return (
        <Card
            padding="0"
            fullWidth
            className={classNames(s.TransactionListItem, {
                [s.income]: isIncome,
                [s.expense]: !isIncome,
            }, [className])}
        >
            <div className={s.date}>{onlyDate}</div>
            <div className={s.details}>
                <div className={s.description}>{transaction.description || 'Без описания'}</div>
                <div className={s.meta}>{sourceLabel} · {paymentMethod}</div>
            </div>
            <span className={s.typeBadge}>{operationLabel}</span>
            <strong className={s.amount}>{isIncome ? '+' : '−'} {formattedAmount}</strong>
            <div className={s.action}>{renderAction?.(transaction)}</div>
        </Card>
    );
};

export default memo(TransactionListItem);
