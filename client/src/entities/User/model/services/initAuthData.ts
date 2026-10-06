import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { User } from '../types/user';
import { userActions } from '../slice/userSlice';
import { csrfActions } from '@/shared/api/api';

export const initAuthData = createAsyncThunk<User, void, ThunkConfig<string>>(
    'user/initAuthData',
    async (_, thunkApi) => {
        const { rejectWithValue, extra, dispatch } = thunkApi;

        try {
            const { data } = await extra.apiPrivate.get<{ data: { user: User; csrfToken: string } }>('/auth/me');
            csrfActions.set(data.data.csrfToken);
            dispatch(userActions.setAuthData(data.data.user));
            return data.data.user;
        } catch (error: unknown) {
            console.log("error: ", error);

            return rejectWithValue('Unknown profile error');
        }
    }
);
