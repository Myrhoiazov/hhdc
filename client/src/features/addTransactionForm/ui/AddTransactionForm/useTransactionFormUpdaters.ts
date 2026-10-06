import { useCallback } from 'react';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { TransactionType } from '@/entities/TransactionType';
import { PaymentMethod } from '@/entities/PaymentMethod';
import { TransactionCategory } from '@/entities/TransactionCategory';
import { addTransactionFormActions } from '../../model/slices/addTransactionFormSlice';

export const useTransactionFormUpdaters = () => {
    const dispatch = useAppDispatch();

    const onChangeTransactionType = useCallback((type: TransactionType) => {
        dispatch(addTransactionFormActions.updateForm({ type: type || TransactionType.INCOME }));
    }, [dispatch]);

    const onChangeTransactionCategory = useCallback((category: TransactionCategory) => {
        dispatch(addTransactionFormActions.updateForm({ category }));
    }, [dispatch]);

    const onChangePaymentMethod = useCallback((type: PaymentMethod) => {
        dispatch(addTransactionFormActions.updateForm({ paymentMethod: type || PaymentMethod.CASH }));
    }, [dispatch]);

    const onChangeSum = useCallback((value?: string) => {
        dispatch(addTransactionFormActions.updateForm({ amount: value ?? '0' }));
    }, [dispatch]);

    const onChangeDescription = useCallback((value?: string) => {
        dispatch(addTransactionFormActions.updateForm({ description: value ?? '' }));
    }, [dispatch]);

    const onChangeDate = useCallback((value?: string) => {
        dispatch(addTransactionFormActions.updateForm({ date: value ?? '' }));
    }, [dispatch]);

    return {
        onChangeTransactionType, onChangeTransactionCategory, onChangePaymentMethod,
        onChangeSum, onChangeDescription, onChangeDate,
    };
};
