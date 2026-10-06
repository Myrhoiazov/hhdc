import { memo } from 'react';
import { TransactionSelect, TransactionType } from '@/entities/TransactionType';
import { PaymentMethod, PaymentMethodSelect } from '@/entities/PaymentMethod';
import { TransactionCategory, TransactionCategorySelect } from '@/entities/TransactionCategory';
import { Transaction } from '@/entities/Transaction';

interface TransactionCategoryFieldsProps {
    data?: Transaction;
    readonly?: boolean;
    onChangeTransactionType?: (type: TransactionType) => void;
    onChangePaymentMethod?: (type: PaymentMethod) => void;
    onChangeTransactionCategory?: (type: TransactionCategory) => void;
}

export const TransactionCategoryFields = memo((props: TransactionCategoryFieldsProps) => {
    const { data, readonly, onChangeTransactionType, onChangePaymentMethod, onChangeTransactionCategory } = props;

    return (
        <>
            <TransactionSelect
                onChange={onChangeTransactionType}
                value={data?.type}
                readonly={readonly}
            />
            <PaymentMethodSelect
                onChange={onChangePaymentMethod}
                value={data?.paymentMethod}
                readonly={readonly}
            />
            <TransactionCategorySelect
                onChange={onChangeTransactionCategory}
                value={data?.category}
            />
        </>
    );
});