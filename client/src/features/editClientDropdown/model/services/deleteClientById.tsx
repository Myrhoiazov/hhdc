import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';

export const deleteClientById = createAsyncThunk<{ message: string }, string, ThunkConfig<string>>(
    'clients/fetchClientById',
    async (clientId, thunkAPI) => {
        const { extra, rejectWithValue } = thunkAPI;
        try {
            const response = await extra.apiPrivate.delete<{ message: string }>(`/clients/${clientId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue('delete');
        }
    }
);
