import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { getAddClientForm } from '../../selectors/getAddClientForm/getAddClientForm';
import { MollieClient } from '@/entities/MollieClient';

export const addMolieClientData = createAsyncThunk<MollieClient, void, ThunkConfig<string>>('mollieClient/addMolieClientData', async (_, thunkApi) => {
    const { extra, rejectWithValue, getState } = thunkApi;

    const clientForm = getAddClientForm(getState());

    if (!clientForm) {
        return rejectWithValue('Форма клиента не заполнена');
    }

    const { givenName, familyName, email } = clientForm;
    if (!givenName?.trim() || !familyName?.trim() || !email?.trim()) {
        return rejectWithValue('Имя, фамилия и email обязательны');
    }

    try {
        const response = await extra.apiPrivate.post<MollieClient>('/mollie/customers', {
            givenName: givenName.trim(),
            familyName: familyName.trim(),
            email: email.trim(),
        });

        if (!response.data) {
            throw new Error();
        }

        return response.data;
    } catch (e) {
        console.log(e);
        return rejectWithValue('error');
    }
});
