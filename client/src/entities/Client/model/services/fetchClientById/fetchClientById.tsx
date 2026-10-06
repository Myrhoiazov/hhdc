import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { Client, ServerError } from '../../types/client';

export const fetchClientById = createAsyncThunk<Client, string, ThunkConfig<ServerError>>(
    'clients/fetchClientById',
    async (clientId, thunkAPI) => {
        const { extra, rejectWithValue } = thunkAPI;
        try {
            const response = await extra.apiPrivate.get<Client>(`/clients/${clientId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue({ status: 500, message: 'Unknown error' });
        }
    }
);
