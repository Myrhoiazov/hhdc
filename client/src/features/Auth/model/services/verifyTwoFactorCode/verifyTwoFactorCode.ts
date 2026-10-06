import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { User, userActions } from '@/entities/User';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { ServerError } from '../loginByUsername/loginByUsername';

interface VerifyTwoFactorCodeProps {
    code: string;
    trustDevice?: boolean;
}

export const verifyTwoFactorCode = createAsyncThunk<User, VerifyTwoFactorCodeProps, ThunkConfig<ServerError>>(
    'login/verifyTwoFactorCode',
    async (payload, thunkAPI) => {
        const { dispatch, extra, rejectWithValue } = thunkAPI;
        try {
            const response = await extra.api.post<User>('/auth/login/2fa/verify', payload);

            if (!response.data) {
                throw new Error('No data received');
            }

            dispatch(userActions.setAuthData(response.data));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status || 500;
                const responseMessage = typeof error.response?.data?.message === 'string'
                    ? error.response.data.message
                    : undefined;
                const message = responseMessage
                    || (error.code === 'ERR_NETWORK'
                        ? 'Локальный сервер недоступен. Запустите backend на порту 8080.'
                        : 'Не удалось подтвердить код.');
                return rejectWithValue({ status, message });
            }

            return rejectWithValue({ status: 500, message: 'Unknown error' });
        }
    },
);
