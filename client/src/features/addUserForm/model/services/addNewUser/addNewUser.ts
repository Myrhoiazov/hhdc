import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { Client } from '@/entities/Client';
import { getAddUserForm } from '../../selectors/getAddUserForm/getAddUserForm';
import { IProfile } from '@/entities/Profile';


export const addNewUser = createAsyncThunk<Client, void, ThunkConfig<string>>('user/addNewUser', async (_, thunkApi) => {
    const { extra, rejectWithValue, getState } = thunkApi;

    const userForm = getAddUserForm(getState());

    if (!userForm) {
        return rejectWithValue('Форма пользователя не заполнена');
    }

    const formData = new FormData();

    Object.entries(userForm).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            formData.append(key, String(value));
        }
    });

    try {
        const response = await extra.apiPrivate.post<IProfile>('/users', userForm);

        if (!response.data) {
            throw new Error();
        }

        return response.data;
    } catch (e) {
        console.log(e);
        return rejectWithValue('error');
    }
});
