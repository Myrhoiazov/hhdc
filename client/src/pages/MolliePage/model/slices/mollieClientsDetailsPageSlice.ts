import {
    createEntityAdapter,
    createSlice,
    PayloadAction,
} from '@reduxjs/toolkit';

import { StateSchema } from '@/app/providers/StoreProvider';
import { fetchMollieClientsList } from '../services/fetchMollieClientsList/fetchMollieClientsList';
import { MollieClient } from '@/entities/MollieClient';
import { fetchAllMandates } from '../services/fetchAllMandates/fetchAllMandates';
import { Mandate } from '@/entities/Mandate';
import { MollieClientsDetailsPageSchema } from '../types/MollieClientsDetailsPageSchema';
import { fetchAllSubscriptions } from '../services/fetchAllSubscriptions/fetchAllSubscriptions';
import { MollieSubscription } from '@/entities/MollieSubscription';

const mollieClientsAdapter = createEntityAdapter<MollieClient, string>({
    selectId: (cliend) => cliend.id as string,
});

const setPending = (state: MollieClientsDetailsPageSchema) => {
    state.error = undefined;
    state.isLoading = true;
};

const setRejected = (state: MollieClientsDetailsPageSchema, action: PayloadAction<string | undefined>) => {
    state.isLoading = false;
    state.error = action.payload;
};

export const getMollieClients = mollieClientsAdapter.getSelectors<StateSchema>(
    (state) => state.mollieClientsPage || mollieClientsAdapter.getInitialState(),
);

const mollieClientsPageSlice = createSlice({
    name: 'mollieClientsPageSlice',
    initialState: mollieClientsAdapter.getInitialState<MollieClientsDetailsPageSchema>({
        isLoading: false,
        error: undefined,
        ids: [],
        mandates: [],
        subscriptions: [],
        page: 1,
        limit: 15,
        total: 0,
        totalPages: 1,
        entities: {},
        _inited: false
    }),
    reducers: {
        initState: (state) => {
            state._inited = true;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMollieClientsList.pending, setPending)
            .addCase(fetchMollieClientsList.fulfilled, (state, action) => {
                state.isLoading = false;
                state.page = action.payload.page;
                state.limit = action.payload.limit;
                state.total = action.payload.total;
                state.totalPages = action.payload.totalPages;

                if (action.meta.arg.replace) {
                    mollieClientsAdapter.setAll(state, action.payload.items);
                } else {
                    mollieClientsAdapter.addMany(state, action.payload.items);
                }
            })
            .addCase(fetchMollieClientsList.rejected, setRejected)
            .addCase(fetchAllMandates.pending, setPending)
            .addCase(fetchAllMandates.fulfilled, (state, action: PayloadAction<Mandate[]>) => {
                state.isLoading = false;
                state.mandates = action.payload;
            })
            .addCase(fetchAllMandates.rejected, setRejected)
            .addCase(fetchAllSubscriptions.pending, setPending)
            .addCase(fetchAllSubscriptions.fulfilled, (state, action: PayloadAction<MollieSubscription[]>) => {
                state.isLoading = false;
                state.subscriptions = action.payload;
            })
            .addCase(fetchAllSubscriptions.rejected, setRejected);
    },
});

export const { reducer: mollieClientsPageSliceReducer, actions: mollieClientsPageSliceActions } = mollieClientsPageSlice;
