import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { MollieSubscription } from '@/entities/MollieSubscription';

interface fetchAllSubscriptionsProps {
    replace?: boolean;
    customerId: string;
}


export const fetchAllSubscriptions = createAsyncThunk<
    MollieSubscription[],
    fetchAllSubscriptionsProps,
    ThunkConfig<string>
>(
    'mollieClientsPage/fetchAllSubscriptions',
    async ({ customerId }, thunkApi) => {
        const { extra, rejectWithValue } = thunkApi;

        try {
            const { data } = await extra.apiPrivate.get<MollieSubscription[]>(`/mollie/customers/${customerId}/subscriptions`);

            if (!data) {
                throw new Error();
            }

            return data;
        } catch (e) {
            return rejectWithValue('error');
        }
    },
);
