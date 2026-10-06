import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AddMollieClientSchema } from '../types/addClientFormSchema';
import { MollieClient } from '@/entities/MollieClient';

const initialState: AddMollieClientSchema = {
    isLoading: false,
    error: undefined,
    data: undefined,
};

const addMollieClientSlice = createSlice({
    name: 'addMollieClientForm',
    initialState,
    reducers: {
        updateProfile: (state, action: PayloadAction<MollieClient>) => {
            state.data = {
                ...state.data,
                ...action.payload,
            };
        },
    },
    // extraReducers: (builder) => {
    //     builder
    //         .addCase(fetchProfileData.pending, (state) => {
    //             state.error = undefined;
    //             state.isLoading = true;
    //         })
    //         .addCase(
    //             fetchProfileData.fulfilled,
    //             (state, action: PayloadAction<Profile>) => {
    //                 state.isLoading = false;
    //                 state.data = action.payload;
    //                 state.form = action.payload;
    //             },
    //         )
    //         .addCase(fetchProfileData.rejected, (state, action) => {
    //             state.isLoading = false;
    //             state.error = action.payload;
    //         })
    //         .addCase(updateProfileData.pending, (state) => {
    //             state.validateErrors = undefined;
    //             state.isLoading = true;
    //         })
    //         .addCase(
    //             updateProfileData.fulfilled,
    //             (state, action: PayloadAction<Profile>) => {
    //                 state.isLoading = false;
    //                 state.data = action.payload;
    //                 state.form = action.payload;
    //                 state.readonly = true;
    //                 state.validateErrors = undefined;
    //             },
    //         )
    //         .addCase(updateProfileData.rejected, (state, action) => {
    //             state.isLoading = false;
    //             state.validateErrors = action.payload;
    //         });
    // },
});

export const { actions: addMollieClientActions, reducer: addMollieClientReducer } = addMollieClientSlice;