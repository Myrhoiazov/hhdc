import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { Transaction } from '@/entities/Transaction';

export const deleteTransactionById = createAsyncThunk<Transaction, string, ThunkConfig<string>>(
    'transactions/deleteTransactionById',
    async (transactionId, thunkAPI) => {
        const { extra, rejectWithValue } = thunkAPI;
        try {
            const response = await extra.apiPrivate.delete<Transaction>(
                `/transactions/${transactionId}`
            );
            return response.data;
        } catch (error) {
            return rejectWithValue('delete');
        }
    }
);
