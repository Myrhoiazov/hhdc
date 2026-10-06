import {
    createEntityAdapter,
    createSlice,
    PayloadAction,
} from '@reduxjs/toolkit';

import { StateSchema } from '@/app/providers/StoreProvider';
import { Client, ClientSortField, ClientView } from '@/entities/Client';
import { ClientPageSchema, ClientPaymentStatusFilter } from '../types/ClientPageSchema';
import { fetchClientsList } from '../services/fetchClientsList/fetchClientsList';
import { CLIENT_VIEW_LOCALSTORAGE_KEY } from '@/shared/const/localstorage';
import { SortOrder } from '@/shared/types/sort';

const clientsAdapter = createEntityAdapter<Client, string>({
    selectId: (cliend) => cliend.id as string,
});

export const getClients = clientsAdapter.getSelectors<StateSchema>(
    (state) => state.clientsPage || clientsAdapter.getInitialState(),
);

const clientsPageSlice = createSlice({
    name: 'clientsPageSlice',
    initialState: clientsAdapter.getInitialState<ClientPageSchema>({
        isLoading: false,
        error: undefined,
        ids: [],
        entities: {},
        page: 1,
        branchId: 'all',
        limit: 9,
        view: ClientView.BIG,
        sort: ClientSortField.CREATED,
        order: 'asc',
        search: '',
        paymentStatus: 'all',
        hasMore: true,
        _inited: false
    }),
    reducers: {
        setView: (state, action: PayloadAction<ClientView>) => {
            state.view = action.payload;
            localStorage.setItem(CLIENT_VIEW_LOCALSTORAGE_KEY, action.payload);
        },
        setOrder: (state, action: PayloadAction<SortOrder>) => {
            state.order = action.payload;
        },
        setSort: (state, action: PayloadAction<ClientSortField>) => {
            state.sort = action.payload;
        },
        setSearch: (state, action: PayloadAction<string>) => {
            state.search = action.payload;
        },
        setPage: (state, action: PayloadAction<number>) => {
            state.page = action.payload;
        },
        setBranchId: (state, action: PayloadAction<string>) => {
            state.branchId = action.payload;
        },
        setPaymentStatus: (state, action: PayloadAction<ClientPaymentStatusFilter>) => {
            state.paymentStatus = action.payload;
        },
        initState: (state) => {
            const view = localStorage.getItem(CLIENT_VIEW_LOCALSTORAGE_KEY) as ClientView;
            state.view = view;
            state._inited = true;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchClientsList.pending, (state) => {
                state.error = undefined;
                state.isLoading = true;
            })
            .addCase(fetchClientsList.fulfilled, (
                state,
                action,
            ) => {
                state.isLoading = false;
                state.hasMore = action.payload.length >= state.limit;

                if (action.meta.arg.replace) {
                    clientsAdapter.setAll(state, action.payload);
                } else {
                    clientsAdapter.addMany(state, action.payload);
                }

            })
            .addCase(fetchClientsList.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    },
});

export const { reducer: clientsPageReducer, actions: clientsPageActions } = clientsPageSlice;
