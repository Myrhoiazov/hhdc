import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { MollieClient } from '@/entities/MollieClient';

interface FetchArticlesListProps {
    replace?: boolean;
}


export const fetchMollieClientsList = createAsyncThunk<
    MollieClient[],
    FetchArticlesListProps,
    ThunkConfig<string>
>(
    'mollieClientsPage/fetchMollieClientsList',
    async (_, thunkApi) => {
        const { extra, rejectWithValue } = thunkApi;

        try {
            const { data } = await extra.apiPrivate.get<MollieClient[]>('/mollie/customers');

            if (!data) {
                throw new Error();
            }

            return data;
        } catch (e) {
            return rejectWithValue('error');
        }
    },
);
