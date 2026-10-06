import axios from 'axios';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { MollieClient } from '@/entities/MollieClient';

export const DELETE_MOLLIE_CLIENT_HAS_DEPENDENCIES = 'has-dependencies';

const isDependencyConflict = (error: unknown) => axios.isAxiosError(error) && error.response?.status === 409;

export const deleteMollieClientById = createAsyncThunk<MollieClient, string, ThunkConfig<string>>(
    'mollieClients/fetchClientById',
    async (clientId, thunkAPI) => {
        const { extra, rejectWithValue } = thunkAPI;
        try {
            const response = await extra.apiPrivate.delete<MollieClient>(`/mollie/customers/${clientId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(isDependencyConflict(error) ? DELETE_MOLLIE_CLIENT_HAS_DEPENDENCIES : 'delete');
        }
    }
);
