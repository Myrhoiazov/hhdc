import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { getMollieSubscriptionData } from '../../selectors/getMollieSubscriptionData';
import { Subscription } from 'react-redux';
import { fetchMollieClientsList } from '../fetchMollieClientsList/fetchMollieClientsList';


export const addSubscription = createAsyncThunk<Subscription, void, ThunkConfig<string>>(
    'mollie/addSubscription',
    async (_, thunkAPI) => {
        const { extra, rejectWithValue, getState, dispatch } = thunkAPI;

        const subscriptionForm = getMollieSubscriptionData(getState());
        console.log("subscriptionForm: ", subscriptionForm);

        if (!subscriptionForm) {
            return rejectWithValue('Форма записи не заполнена');
        }


        try {
            const { data } = await extra.apiPrivate.post<Subscription>(`/mollie/mandates/${subscriptionForm.customerId}/subscriptions`, subscriptionForm);

            if (!data) {
                throw new Error();
            }

            dispatch(fetchMollieClientsList())

            return data;
        } catch (e) {
            console.log(e);
            return rejectWithValue('error');
        }
    });
