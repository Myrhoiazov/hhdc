import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { User } from '../types/user';
import { userActions } from '../slice/userSlice';

export const initAuthData = createAsyncThunk<User, void, ThunkConfig<string>>(
    'user/initAuthData',
    async (_, thunkApi) => {
        const { rejectWithValue, extra, dispatch } = thunkApi;

        try {
            const { data } = await extra.apiPrivate.get<User>('/profile');
            if (!data) {
                return rejectWithValue('');
            }

            dispatch(userActions.setAuthData(data));
            return data;
        } catch (error: unknown) {
            console.log("error: ", error);

            return rejectWithValue('Unknown profile error');
        }
    }
);
