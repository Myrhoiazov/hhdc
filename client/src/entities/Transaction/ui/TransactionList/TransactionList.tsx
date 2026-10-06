import { memo, ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './TransactionList.module.scss';
import { Transaction } from '../../model/types/transaction';
import TransactionListItem from '../TransactionListItem/TransactionListItem';
import { VStack } from '@/shared/ui/Stack';
import { StateView } from '@/shared/ui/StateView';
import { ListSkeleton } from '@/shared/ui/ListSkeleton';

interface TransactionListProps {
    className?: string;
    transactions: Transaction[];
    isLoading?: boolean;
    renderAction?: (transaction: Transaction) => ReactNode;
}

export const TransactionList = memo((props: TransactionListProps) => {
    const { className, transactions, isLoading, renderAction } = props;

    if (!isLoading && !transactions.length) {
        return (
            <StateView
                className={classNames(s.TransactionList, {}, [className])}
                title="Транзакции не найдены"
                text="Когда появятся платежи или ручные операции, они будут здесь."
            />
        );
    }

    const renderTransactions = (trans: Transaction) => (
        <TransactionListItem
            className={s.card}
            transaction={trans}
            key={trans.id}
            renderAction={renderAction}
        />
    );

    return (
        <div className={classNames(s.TransactionList, {}, [className])}>
            <VStack gap="16">
                {transactions.length > 0 ? transactions.map(renderTransactions) : null}
                {isLoading && <ListSkeleton rows={transactions.length ? 1 : 4} height={60} />}
            </VStack>
        </div>
    );
});
