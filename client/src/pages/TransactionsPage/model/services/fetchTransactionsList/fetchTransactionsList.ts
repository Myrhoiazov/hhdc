import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
// import { getClientsPageOrder, getClientsPageSearch, getClientsPageSort, getClientsPageType } from '../../selectors/clientsPageSelectors';
import { addQueryParams } from '@/shared/lib/url/addQueryParams/addQueryParams';
import { Transaction } from '@/entities/Transaction';
import { getTransactionPageLimit, getTransactionPageMonth, getTransactionPageOrder, getTransactionPagePage, getTransactionPageSearch, getTransactionPageSort, getTransactionPageType } from '../../selectors/transactionPageSelectors';
import { TransactionType } from '@/entities/TransactionType';
import { fetchTransactionsSummary } from '../fetchTransactionsSummary/fetchTransactionsSummary';

interface FetchTransactionsListProps {
    replace?: boolean;
    noQuery?: boolean
}

export interface TransactionsListResponse {
    items: Transaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const fetchTransactionsList = createAsyncThunk<
    TransactionsListResponse,
    FetchTransactionsListProps,
    ThunkConfig<string>
>(
    'transactionsPage/fetchTransactionsList',
    async (_props, thunkApi) => {
        const { extra, rejectWithValue, getState, dispatch } = thunkApi;
        const search = getTransactionPageSearch(getState());
        const sort = getTransactionPageSort(getState());
        const order = getTransactionPageOrder(getState());
        const type = getTransactionPageType(getState());
        const month = getTransactionPageMonth(getState());
        const page = getTransactionPagePage(getState());
        const limit = getTransactionPageLimit(getState());

        addQueryParams({ sort, order, search, type, month });

        try {
            const { data } = await extra.apiPrivate.get<TransactionsListResponse>('/transactions', {
                params: {
                    _q: search,
                    _sortBy: sort,
                    _order: order,
                    _month: month,
                    _type: type === TransactionType.ALL ? null : type,
                    _page: page,
                    _limit: limit,
                }
            });

            if (!data) {
                throw new Error('error');
            }

            dispatch(fetchTransactionsSummary());

            return data;
        } catch (e) {
            return rejectWithValue('error');
        }
    },
);
