import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { MollieSubscription } from '@/entities/MollieSubscription';

interface DeleteSubscriptionByIdArgs {
    customerId: string;
    subscriptionId: string;
}

export const deleteSubscriptionById = createAsyncThunk<
    MollieSubscription,
    DeleteSubscriptionByIdArgs,
    ThunkConfig<string>
>('subscriptions/fetchSubscriptionById', async ({ customerId, subscriptionId }, thunkAPI) => {
    const { extra, rejectWithValue } = thunkAPI;

    try {
        const response = await extra.apiPrivate.delete<MollieSubscription>(
            `/mollie/subscriptions/${subscriptionId}`,
            {
                data: { customerId: Number(customerId) },
            }
        );
        return response.data;
    } catch (error) {
        return rejectWithValue('delete');
    }
});
