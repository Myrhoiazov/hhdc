import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { ServerError } from '../../types/client';

export const deleteClientById = createAsyncThunk<{ message: string }, void, ThunkConfig<ServerError>>(
    'clients/fetchClientById',
    async (clientId, thunkAPI) => {
        const { extra, rejectWithValue } = thunkAPI;
        try {
            const response = await extra.apiPrivate.delete<{ message: string }>(`/clients/${clientId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue({ status: 500, message: 'Unknown error' });
        }
    }
);
