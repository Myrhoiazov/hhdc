import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AddMollieSubscriptionSchema } from '../types/addMollieSubscriptionSchema';
import { MollieSubscription } from '@/entities/MollieSubscription';
import { addSubscription } from '../services/addSubscription/addSubscription';
import { fetchMollieClientsList } from '../services/fetchMollieClientsList/fetchMollieClientsList';
import { MollieClient } from '@/entities/MollieClient';

const initialState: AddMollieSubscriptionSchema = {
    data: undefined,
    customers: undefined,
    isLoading: false,
    error: undefined
};

const addMollieSubscriptionSlice = createSlice({
    name: 'addMollieSubscriptionForm',
    initialState,
    reducers: {
        update: (state, action: PayloadAction<MollieSubscription>) => {
            state.data = {
                ...state.data,
                ...action.payload
            }

        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(addSubscription.pending, (state) => {
                state.error = undefined;
                state.isLoading = true;
            })
            .addCase(addSubscription.fulfilled, (state) => {
                state.isLoading = false;
            })
            .addCase(addSubscription.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
        builder
            .addCase(fetchMollieClientsList.pending, (state) => {
                state.error = undefined;
                state.isLoading = true;
            })
            .addCase(fetchMollieClientsList.fulfilled, (state, action: PayloadAction<MollieClient[]>) => {
                state.isLoading = false;
                state.customers = action.payload
            })
            .addCase(fetchMollieClientsList.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });;
    },
});

export const { actions: addMollieSubscriptionActions, reducer: addMollieSubscriptionReducer } = addMollieSubscriptionSlice;