import { useSelector } from 'react-redux';
import { useCallback } from 'react';
import { ActionCreatorWithPayload } from '@reduxjs/toolkit';
import {
    getTransactionPageMonth,
    getTransactionPageOrder,
    getTransactionPageSearch,
    getTransactionPageSort,
    getTransactionPageType,
} from '../../model/selectors/transactionPageSelectors';
import { useDebounce } from '@/shared/lib/hooks/useDebounce/useDebounce';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { AppDispatch } from '@/app/providers/StoreProvider';
import { SortOrder } from '@/shared/types/sort';
import { TransactionType } from '@/entities/TransactionType';
import { TransactionSortField } from '@/entities/Transaction';
import { fetchTransactionsList } from '../../model/services/fetchTransactionsList/fetchTransactionsList';
import { transactionsPageActions } from '../../model/slices/transactionsPageSlice';
import { Month } from '@/entities/Month';

// Every filter change follows the same shape: set the field, reset to page 1,
// re-fetch. Only the action creator (and, for search, the debounce) differs.
const applyFilterChange = <T,>(
    dispatch: AppDispatch,
    fetchData: () => void,
    setAction: ActionCreatorWithPayload<T>,
    value: T,
) => {
    dispatch(setAction(value));
    dispatch(transactionsPageActions.setPage(1));
    fetchData();
};

export function useTransactionFilters() {
    const search = useSelector(getTransactionPageSearch);
    const sort = useSelector(getTransactionPageSort);
    const order = useSelector(getTransactionPageOrder);
    const month = useSelector(getTransactionPageMonth);
    const type = useSelector(getTransactionPageType);

    const dispatch = useAppDispatch();

    const fetchData = useCallback(() => {
        dispatch(fetchTransactionsList({ replace: true }));
    }, [dispatch]);

    const debouncedFetchData = useDebounce(fetchData, 500);

    const onChangeSearch = useCallback((value: string) => (
        applyFilterChange(dispatch, debouncedFetchData, transactionsPageActions.setSearch, value)
    ), [dispatch, debouncedFetchData]);

    const onChangeSort = useCallback((value: TransactionSortField) => (
        applyFilterChange(dispatch, fetchData, transactionsPageActions.setSort, value)
    ), [dispatch, fetchData]);

    const onChangeMonth = useCallback((value: Month) => (
        applyFilterChange(dispatch, fetchData, transactionsPageActions.setMonth, value)
    ), [dispatch, fetchData]);

    const onChangeOrder = useCallback((value: SortOrder) => (
        applyFilterChange(dispatch, fetchData, transactionsPageActions.setOrder, value)
    ), [dispatch, fetchData]);

    const onChangeType = useCallback((value: TransactionType) => (
        applyFilterChange(dispatch, fetchData, transactionsPageActions.setType, value)
    ), [dispatch, fetchData]);

    return {
        search,
        month,
        sort,
        order,
        type,
        onChangeSearch,
        onChangeOrder,
        onChangeSort,
        onChangeType,
        onChangeMonth,
    };
}
