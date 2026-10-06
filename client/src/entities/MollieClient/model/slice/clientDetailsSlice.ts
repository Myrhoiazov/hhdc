import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MollieClient } from '../types/mollieClient';
import { fetchClientById } from '../services/fetchClientById/fetchClientById';
import { MollieClientDetailsSchema } from '../types/molliCclientDetailsSchema';

const initialState: MollieClientDetailsSchema = {
    isLoading: false,
    error: undefined,
    data: undefined,
};

const mollieClientDetailsSlice = createSlice({
    name: 'mollieClientDetailsSlice',
    initialState,
    reducers: {
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchClientById.pending, (state) => {
                state.error = undefined;
                state.isLoading = true;
            })
            .addCase(fetchClientById.fulfilled, (
                state,
                action: PayloadAction<MollieClient>,
            ) => {
                state.isLoading = false;
                state.data = action.payload;
            })
            .addCase(fetchClientById.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
    },
});

// Action creators are generated for each case reducer function
export const { actions: mollieClientDetailsSliceclientDetailsActions } = mollieClientDetailsSlice;
export const { reducer: mollieClientDetailsSliceReducer } = mollieClientDetailsSlice;
