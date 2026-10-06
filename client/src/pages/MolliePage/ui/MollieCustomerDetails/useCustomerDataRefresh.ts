import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { useInitialEffect } from '@/shared/lib/hooks/useInitialEffect/useInitialEffect';
import { fetchAllMandates } from '../../model/services/fetchAllMandates/fetchAllMandates';
import { fetchAllSubscriptions } from '../../model/services/fetchAllSubscriptions/fetchAllSubscriptions';
import {
    getMollieClientsPageIsLoading,
    getMollieClientsPageMandates,
    getMollieClientsPageSubscriptions,
} from '../../model/selectors/mollieClientsPageSelectors';

export const useCustomerDataRefresh = (customerId: string | undefined) => {
    const dispatch = useAppDispatch();
    const mandates = useSelector(getMollieClientsPageMandates);
    const subscriptions = useSelector(getMollieClientsPageSubscriptions);
    const isLoading = useSelector(getMollieClientsPageIsLoading);
    const [detailsVersion, setDetailsVersion] = useState(0);

    useInitialEffect(() => {
        if (customerId) {
            dispatch(fetchAllMandates({ customerId }));
            dispatch(fetchAllSubscriptions({ customerId }));
        }
    });

    const onReloadCustomerDetails = () => {
        if (!customerId) return;
        setDetailsVersion((version) => version + 1);
        dispatch(fetchAllMandates({ customerId }));
        dispatch(fetchAllSubscriptions({ customerId }));
    };

    return {
        mandates, subscriptions, isLoading, detailsVersion, onReloadCustomerDetails,
    };
};
