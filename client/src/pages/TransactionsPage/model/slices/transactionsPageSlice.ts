import {
    createSlice,
    PayloadAction,
} from '@reduxjs/toolkit';

import { SortOrder } from '@/shared/types/sort';
import { fetchTransactionsList, TransactionsListResponse } from '../services/fetchTransactionsList/fetchTransactionsList';
import { Transaction, TransactionSortField } from '@/entities/Transaction';
import { TransactionType } from '@/entities/TransactionType';
import { Summary } from '@/entities/Summary';
import { fetchTransactionsSummary } from '../services/fetchTransactionsSummary/fetchTransactionsSummary';
import { Month } from '@/entities/Month';

interface TransactionsPageState {
    isLoading: boolean;
    error?: string;
    search: string;
    items?: Transaction[];
    summary?: Summary,
    page: number;
    month?: Month;
    type: TransactionType;
    sort: TransactionSortField,
    limit: number;
    total: number;
    totalPages: number;
    order: SortOrder;
    hasMore: boolean;
    _inited: boolean;
}

const initialState: TransactionsPageState = {
    isLoading: false,
    error: undefined,
    items: undefined,
    summary: undefined,
    page: 1,
    sort: TransactionSortField.ID,
    type: TransactionType.ALL,
    limit: 20,
    total: 0,
    totalPages: 1,
    month: Month.ALL,
    order: 'desc',
    search: '',
    hasMore: true,
    _inited: false
};

const transactionsPageSlice = createSlice({
    name: 'transactionsPageSlice',
    initialState,
    reducers: {
        setOrder: (state, action: PayloadAction<SortOrder>) => {
            state.order = action.payload;
        },
        setPage: (state, action: PayloadAction<number>) => {
            state.page = action.payload;
        },
        setType: (state, action: PayloadAction<TransactionType>) => {
            state.type = action.payload;
        },
        setSearch: (state, action: PayloadAction<string>) => {
            state.search = action.payload;
        },
        setMonth: (state, action: PayloadAction<Month>) => {
            state.month = action.payload;
        },

        setSort: (state, action: PayloadAction<TransactionSortField>) => {
            state.sort = action.payload;
        },
        initState: (state) => {
            state._inited = true;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchTransactionsList.pending, (state) => {
                state.error = undefined;
                state.isLoading = true;
            })
            .addCase(fetchTransactionsList.fulfilled, (
                state,
                action: PayloadAction<TransactionsListResponse>,
            ) => {
                state.isLoading = false;
                state.items = action.payload.items;
                state.page = action.payload.page;
                state.limit = action.payload.limit;
                state.total = action.payload.total;
                state.totalPages = action.payload.totalPages;
                state.hasMore = action.payload.page < action.payload.totalPages;
            })
            .addCase(fetchTransactionsList.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(fetchTransactionsSummary.pending, (state) => {
                state.error = undefined;
                state.isLoading = true;
            })
            .addCase(fetchTransactionsSummary.fulfilled, (
                state,
                action: PayloadAction<Summary>,
            ) => {
                state.isLoading = false;
                state.summary = action.payload
            })
            .addCase(fetchTransactionsSummary.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    },
});

export const { reducer: transactionsPageReducer, actions: transactionsPageActions } = transactionsPageSlice;
