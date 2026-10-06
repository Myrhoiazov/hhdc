import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { SortOrder } from '@/shared/types/sort';
import { fetchTransactionsList } from '../fetchTransactionsList/fetchTransactionsList';
import { transactionsPageActions } from '../../slices/transactionsPageSlice';
import { getTransactionPageInited } from '../../selectors/transactionPageSelectors';
import { TransactionSortField } from '@/entities/Transaction';
import { fetchTransactionsSummary } from '../fetchTransactionsSummary/fetchTransactionsSummary';


export const initTransactionsPage = createAsyncThunk<
    void,
    URLSearchParams,
    ThunkConfig<string>
>(
    'transactionsPage/initTransactionsPage',
    async (searchParams, thunkApi) => {
        const { getState, dispatch } = thunkApi;
        const inited = getTransactionPageInited(getState());

        if (!inited) {
            const orderFromUrl = searchParams.get('order') as SortOrder;
            const sortFromUrl = searchParams.get('sort') as TransactionSortField;
            const searchFromUrl = searchParams.get('search');

            if (orderFromUrl) {
                dispatch(transactionsPageActions.setOrder(orderFromUrl));
            }
            if (sortFromUrl) {
                dispatch(transactionsPageActions.setSort(sortFromUrl));
            }
            if (searchFromUrl) {
                dispatch(transactionsPageActions.setSearch(searchFromUrl));
            }

            dispatch(transactionsPageActions.initState());
            dispatch(fetchTransactionsList({}));
            dispatch(fetchTransactionsSummary());
        }
    },
);
