import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CreateMollieMandateFormSchema } from '../types/createMollieMandateFormSchema';
import { Mandate } from '@/entities/Mandate';
import { addMandate } from '../services/addMandate/addMandate';
import { fetchMollieClientsList } from '../services/fetchMollieClientsList/fetchMollieClientsList';
import { MollieClient } from '@/entities/MollieClient';

const initialState: CreateMollieMandateFormSchema = {
    data: undefined,
    customers: undefined,
    isLoading: false,
    error: undefined
};

const createMollieMandateFormSlice = createSlice({
    name: 'createMollieMandateForm',
    initialState,
    reducers: {
        updateFotm: (state, action: PayloadAction<Mandate>) => {
            state.data = {
                ...state.data,
                ...action.payload,
            };
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(addMandate.pending, (state) => {
                state.error = undefined;
                state.isLoading = true;
            })
            .addCase(addMandate.fulfilled, (state) => {
                state.isLoading = false;
            })
            .addCase(addMandate.rejected, (state, action) => {
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
            });
    },
});

export const { actions: createMollieMandateFormActions } = createMollieMandateFormSlice;
export const { reducer: createMollieMandateFormReducer } = createMollieMandateFormSlice;