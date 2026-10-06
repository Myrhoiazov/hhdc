import { useSelector } from 'react-redux';
import { useCallback } from 'react';
import { ActionCreatorWithPayload } from '@reduxjs/toolkit';
import {
    getClientsPageBranchId,
    getClientsPageOrder,
    getClientsPagePaymentStatus,
    getClientsPageSearch,
    getClientsPageSort,
} from '../../model/selectors/clientsPageSelectors';
import { useDebounce } from '@/shared/lib/hooks/useDebounce/useDebounce';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { AppDispatch } from '@/app/providers/StoreProvider';
import { ClientSortField } from '@/entities/Client';
import { SortOrder } from '@/shared/types/sort';
import { clientsPageActions } from '../../model/slices/clientsPageSlice';
import { fetchClientsList } from '../../model/services/fetchClientsList/fetchClientsList';
import { ClientPaymentStatusFilter } from '../../model/types/ClientPageSchema';

// Every filter change follows the same shape: set the field, re-fetch. Only
// the action creator (and, for search, the debounce) differs.
const applyFilterChange = <T,>(
    dispatch: AppDispatch,
    fetchData: () => void,
    setAction: ActionCreatorWithPayload<T>,
    value: T,
) => {
    dispatch(setAction(value));
    fetchData();
};

export function useClientFilters() {
    const search = useSelector(getClientsPageSearch);
    const sort = useSelector(getClientsPageSort);
    const order = useSelector(getClientsPageOrder);
    const branchId = useSelector(getClientsPageBranchId);
    const paymentStatus = useSelector(getClientsPagePaymentStatus);

    const dispatch = useAppDispatch();

    const fetchData = useCallback(() => {
        dispatch(fetchClientsList({ replace: true }));
    }, [dispatch]);

    const debouncedFetchData = useDebounce(fetchData, 500);

    const onChangeSearch = useCallback((value: string) => (
        applyFilterChange(dispatch, debouncedFetchData, clientsPageActions.setSearch, value)
    ), [dispatch, debouncedFetchData]);

    const onChangeSort = useCallback((value: ClientSortField) => (
        applyFilterChange(dispatch, fetchData, clientsPageActions.setSort, value)
    ), [dispatch, fetchData]);

    const onChangeOrder = useCallback((value: SortOrder) => (
        applyFilterChange(dispatch, fetchData, clientsPageActions.setOrder, value)
    ), [dispatch, fetchData]);

    const onChangeBranch = useCallback((value: string) => (
        applyFilterChange(dispatch, fetchData, clientsPageActions.setBranchId, value)
    ), [dispatch, fetchData]);

    const onChangePaymentStatus = useCallback((value: ClientPaymentStatusFilter) => (
        applyFilterChange(dispatch, fetchData, clientsPageActions.setPaymentStatus, value)
    ), [dispatch, fetchData]);

    return {
        search,
        sort,
        order,
        branchId,
        paymentStatus,
        onChangeSearch,
        onChangeOrder,
        onChangeSort,
        onChangeBranch,
        onChangePaymentStatus,
    };
}
