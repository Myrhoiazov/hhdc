import { useCallback } from 'react';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { MandateMethod } from '@/entities/MandateMethod';
import { MollieClient } from '@/entities/MollieClient';
import { createMollieMandateFormActions } from '../../model/slices/createMollieMandateFormSlice';

export const useMollieMandateUpdaters = () => {
    const dispatch = useAppDispatch();

    const onChangeDate = useCallback((value: string) => {
        dispatch(createMollieMandateFormActions.updateFotm({ signatureDate: value }));
    }, [dispatch]);

    const onChangeCustomer = useCallback((customer?: MollieClient) => {
        dispatch(createMollieMandateFormActions.updateFotm({ customerId: customer?.mollieId }));
    }, [dispatch]);

    const onChangeMandateMethod = useCallback((value: MandateMethod) => {
        dispatch(createMollieMandateFormActions.updateFotm({ method: value }));
    }, [dispatch]);

    return { onChangeDate, onChangeCustomer, onChangeMandateMethod };
};
