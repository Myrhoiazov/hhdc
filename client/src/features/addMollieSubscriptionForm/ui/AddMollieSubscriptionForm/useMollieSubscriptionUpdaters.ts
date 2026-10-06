import { useCallback } from 'react';
import { Payment } from '@/entities/MollieSubscription';
import { MollieClient } from '@/entities/MollieClient';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { addMollieSubscriptionActions } from '../../model/slices/addMollieSubscriptionSlice';

export const useMollieSubscriptionUpdaters = () => {
    const dispatch = useAppDispatch();

    const onChangeDateStart = useCallback((value?: string) => {
        dispatch(addMollieSubscriptionActions.update({ startDate: value }));
    }, [dispatch]);

    const onChangeDescription = useCallback((value?: string) => {
        dispatch(addMollieSubscriptionActions.update({ description: value }));
    }, [dispatch]);

    const onChangeCustomer = useCallback((customer?: MollieClient) => {
        dispatch(addMollieSubscriptionActions.update({ customerId: customer?.mollieId }));
    }, [dispatch]);

    const onChangeTimes = useCallback((value?: string) => {
        dispatch(addMollieSubscriptionActions.update({ times: Number(value) }));
    }, [dispatch]);

    const onChangeInterval = useCallback((value?: string) => {
        dispatch(addMollieSubscriptionActions.update({ interval: value }));
    }, [dispatch]);

    const onChangeSum = useCallback((value?: Payment) => {
        dispatch(addMollieSubscriptionActions.update({ amount: value }));
    }, [dispatch]);

    return {
        onChangeDateStart, onChangeDescription, onChangeCustomer,
        onChangeTimes, onChangeInterval, onChangeSum,
    };
};
