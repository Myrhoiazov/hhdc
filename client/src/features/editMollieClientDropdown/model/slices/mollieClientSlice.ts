import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MollieClientFormSchema } from '../types/mollieClientFormSchema';
import { MollieClient } from '@/entities/MollieClient';
import { fetchMollieClientData } from '../services/fetchMollieClientData/fetchMollieClientData';
import { updateMollieClientData } from '../services/updateMollieClientData/updateMollieClientData';

const initialState: MollieClientFormSchema = {
    readonly: true,
    isLoading: false,
    error: undefined,
    data: undefined,
};

const mollieClientSlice = createSlice({
    name: 'mollieClientSlice',
    initialState,
    reducers: {
        setReadonly: (state, action: PayloadAction<boolean>) => {
            state.readonly = action.payload;
        },
        cancelEdit: (state) => {
            state.readonly = true;
            state.form = state.data;
        },
        cleanForm: (state) => {
            state.readonly = true;
            state.form = undefined;
            state.data = undefined;
        },
        updateProfile: (state, action: PayloadAction<MollieClient>) => {
            state.form = {
                ...state.form,
                ...action.payload,
            };
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMollieClientData.pending, (state) => {
                state.error = undefined;
                state.isLoading = true;
            })
            .addCase(
                fetchMollieClientData.fulfilled,
                (state, action: PayloadAction<MollieClient>) => {
                    state.isLoading = false;
                    state.data = action.payload;
                    state.form = action.payload;
                },
            )
            .addCase(fetchMollieClientData.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(updateMollieClientData.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(
                updateMollieClientData.fulfilled,
                (state, action: PayloadAction<MollieClient>) => {
                    state.isLoading = false;
                    state.data = action.payload;
                    state.form = action.payload;
                    state.readonly = true;
                },
            )
            .addCase(updateMollieClientData.rejected, (state, action) => {
                state.isLoading = false;
            });
    },
});

export const { actions: mollieClientActions, reducer: mollieClientReducer } = mollieClientSlice;