import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { MollieClient } from '@/entities/MollieClient';

export const fetchMollieClientData = createAsyncThunk<MollieClient, string, ThunkConfig<string>>(
    'mollieCustomer/fetchMollieCustomerData',
    async (customerId, thunkAPI) => {
        const { extra, rejectWithValue } = thunkAPI;
        try {
            const { data } = await extra.apiPrivate.get<MollieClient>(
                `/mollie/customers/edit-data/${customerId}`
            );

            if (!data) {
                throw new Error();
            }

            return data;
        } catch (error) {
            return rejectWithValue('unknown error');
        }
    }
);
