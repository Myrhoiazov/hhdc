import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { MollieClient } from '../../types/mollieClient';

export const fetchClientById = createAsyncThunk<MollieClient, string, ThunkConfig<string>>(
    'mollieClientDetails/fetchClientById',
    async (clientId, thunkAPI) => {
        const { extra, rejectWithValue } = thunkAPI;
        try {
            const { data } = await extra.apiPrivate.get<MollieClient>(
                `/mollie/customers/${clientId}`
            );

            if (!data) {
                throw new Error();
            }

            return data;
        } catch (error) {
            return rejectWithValue('some error');
        }
    }
);
