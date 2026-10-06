import { memo } from 'react';
import { TransactionType } from '@/entities/TransactionType';
import { Transaction } from '@/entities/Transaction';
import { PaymentMethod } from '@/entities/PaymentMethod';
import { TransactionCategory } from '@/entities/TransactionCategory';
import { TransactionCategoryFields } from './TransactionCategoryFields';
import { TransactionAmountFields } from './TransactionAmountFields';

export interface TransactionCardProps {
    className?: string;
    data?: Transaction;
    error?: string;
    isLoading?: boolean;
    readonly?: boolean;
    onChangeDate?: (value?: string) => void;
    onChangeSum?: (value?: string) => void;
    onChangeDescription?: (value?: string) => void;
    onChangeTransactionType?: (type: TransactionType) => void;
    onChangePaymentMethod?: (type: PaymentMethod) => void;
    onChangeTransactionCategory?: (type: TransactionCategory) => void;
}

export const TransactionCard = memo((props: TransactionCardProps) => {
    const {
        data,
        readonly,
        onChangeDate,
        onChangeSum,
        onChangeTransactionType,
        onChangeDescription,
        onChangePaymentMethod,
        onChangeTransactionCategory,
    } = props;

    return (
        <>
            <TransactionCategoryFields
                data={data}
                readonly={readonly}
                onChangeTransactionType={onChangeTransactionType}
                onChangePaymentMethod={onChangePaymentMethod}
                onChangeTransactionCategory={onChangeTransactionCategory}
            />
            <TransactionAmountFields
                data={data}
                onChangeDate={onChangeDate}
                onChangeSum={onChangeSum}
                onChangeDescription={onChangeDescription}
            />
        </>
    );
});

export default TransactionCard;