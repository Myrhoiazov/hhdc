import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AddTransactionFormSchema } from '../types/addTransactionFormSchema';
import { Transaction } from '@/entities/Transaction';

const initialState: AddTransactionFormSchema = {
    readonly: true,
    isLoading: false,
    error: undefined,
    data: undefined,
};

const addTransactionFormSlice = createSlice({
    name: 'addTransactionForm',
    initialState,
    reducers: {
        setReadonly: (state, action: PayloadAction<boolean>) => {
            state.readonly = action.payload;
        },
        cancelEdit: (state) => {
            state.readonly = true;
            state.data = undefined;
        },
        cleanForm: (state) => {
            state.readonly = true;
            state.data = undefined;
        },
        updateForm: (state, action: PayloadAction<Transaction>) => {
            state.data = {
                ...state.data,
                ...action.payload,
            };
        },
    },
    // extraReducers: (builder) => {
    //     builder
    //         .addCase(, (state) => {
    //             state.error = undefined;
    //             state.isLoading = true;
    //         })
    //         .addCase(, (state) => {
    //             state.isLoading = false;
    //         })
    //         .addCase(, (state, action) => {
    //             state.isLoading = false;
    //             state.error = action.payload;
    //         });
    // },
});

export const { actions: addTransactionFormActions } = addTransactionFormSlice;
export const { reducer: addTransactionFormReducer } = addTransactionFormSlice;