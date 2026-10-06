import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ClientSchema } from '../types/addClientFormSchema';
import { Client } from '@/entities/Client';

const initialState: ClientSchema = {
    readonly: true,
    isLoading: false,
    error: undefined,
    data: undefined,
};

const clientSlice = createSlice({
    name: 'client',
    initialState,
    reducers: {
        setReadonly: (state, action: PayloadAction<boolean>) => {
            state.readonly = action.payload;
        },
        cancelEdit: (state) => {
            state.readonly = true;
            state.validateErrors = undefined;
            state.form = state.data;
        },
        cleanForm: (state) => {
            state.readonly = true;
            state.validateErrors = undefined;
            state.form = undefined;
            state.data = undefined;
        },
        updateProfile: (state, action: PayloadAction<Client>) => {
            state.form = {
                ...state.form,
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

export const { actions: clientActions } = clientSlice;
export const { reducer: clientReducer } = clientSlice;