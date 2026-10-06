import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Client } from '../types/client';
import { fetchClientById } from '../services/fetchClientById/fetchClientById';
import { ClientDetailsSchema } from '../types/clientDetailsSchema';

const initialState: ClientDetailsSchema = {
    isLoading: false,
    error: undefined,
    data: undefined,
};

const clientDetailsSlice = createSlice({
    name: 'clientDetailsSlice',
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
                action: PayloadAction<Client>,
            ) => {
                state.isLoading = false;
                state.data = action.payload;
            })
            .addCase(fetchClientById.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
        // .addCase(updateProfileData.pending, (state) => {
        //     state.error = undefined;
        //     state.isLoading = true;
        //     state.validateErrors = undefined;
        // })
        // .addCase(updateProfileData.fulfilled, (
        //     state,
        //     action: PayloadAction<Client>,
        // ) => {
        //     state.isLoading = false;
        //     state.data = action.payload;
        //     state.form = action.payload;
        //     state.readonly = true;
        //     state.validateErrors = undefined;
        // })
        // .addCase(updateProfileData.rejected, (state, action) => {
        //     state.isLoading = false;
        //     state.validateErrors = action.payload;
        // });
    },
});

// Action creators are generated for each case reducer function
export const { actions: clientDetailsActions } = clientDetailsSlice;
export const { reducer: clientDetailsReducer } = clientDetailsSlice;
