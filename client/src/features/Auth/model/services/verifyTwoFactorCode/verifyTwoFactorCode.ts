import { createAsyncThunk } from '@reduxjs/toolkit';
import { User, userActions } from '@/entities/User';
import { ThunkConfig } from '@/shared/lib/store/StateSchema';
import { csrfActions } from '@/shared/api/api';
import { readServerError, ServerError, SessionResponse } from '../loginByUsername/loginByUsername';

interface VerifyTwoFactorCodeProps {
    code: string;
    trustDevice?: boolean;
}

export const verifyTwoFactorCode = createAsyncThunk<
    User,
    VerifyTwoFactorCodeProps,
    ThunkConfig<ServerError>
>('login/verifyTwoFactorCode', async (payload, thunkAPI) => {
    const { dispatch, extra, rejectWithValue } = thunkAPI;
    try {
        const response = await extra.api.post<{ data: SessionResponse }>(
            '/auth/login/2fa/verify',
            payload
        );

        if (!response.data) {
            throw new Error('No data received');
        }

        const { user, csrfToken } = response.data.data;
        csrfActions.set(csrfToken);
        dispatch(userActions.setAuthData(user));
        return user;
    } catch (error) {
        return rejectWithValue(readServerError(error, 'Не удалось подтвердить код.'));
    }
});
