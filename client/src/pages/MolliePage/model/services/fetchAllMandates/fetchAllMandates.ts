import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { Mandate } from '@/entities/Mandate';

interface fetchAllMandatesProps {
    replace?: boolean;
    customerId: string;
}


export const fetchAllMandates = createAsyncThunk<
    Mandate[],
    fetchAllMandatesProps,
    ThunkConfig<string>
>(
    'mollieClientsPage/fetchAllMandates',
    async ({ customerId }, thunkApi) => {
        const { extra, rejectWithValue } = thunkApi;

        try {
            const { data } = await extra.apiPrivate.get<Mandate[]>(`/mollie/mandates/${customerId}`);

            if (!data) {
                throw new Error();
            }

            return data;
        } catch (e) {
            return rejectWithValue('error');
        }
    },
);
