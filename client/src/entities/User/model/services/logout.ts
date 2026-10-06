import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { userActions } from '../slice/userSlice';
import { csrfActions } from '@/shared/api/api';

export const logout = createAsyncThunk<void, void, ThunkConfig<string>>(
    'user/initAuthData',
    async (_, thunkApi) => {
        const { rejectWithValue, extra, dispatch } = thunkApi;

        try {
            await extra.apiPrivate.post('/auth/logout');
            csrfActions.reset();
            dispatch(userActions.logout());
        } catch (error: any) {
            csrfActions.reset();
            dispatch(userActions.logout());
            return rejectWithValue('REFRESH_FAILED');
        }
    }
);
