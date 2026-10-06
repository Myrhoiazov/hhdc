import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { ServerError } from '../loginByUsername/loginByUsername';

interface ResendServerError extends ServerError {
    retryAfterSeconds?: number;
}

export const resendTwoFactorCode = createAsyncThunk<void, void, ThunkConfig<ResendServerError>>(
    'login/resendTwoFactorCode',
    async (_, thunkAPI) => {
        const { extra, rejectWithValue } = thunkAPI;
        try {
            await extra.api.post('/auth/login/2fa/resend');
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status || 500;
                const responseMessage = typeof error.response?.data?.message === 'string'
                    ? error.response.data.message
                    : undefined;
                const retryAfterHeader = error.response?.headers?.['retry-after'];
                const retryAfterSeconds = typeof retryAfterHeader === 'string'
                    ? Number(retryAfterHeader)
                    : undefined;
                const message = responseMessage
                    || (error.code === 'ERR_NETWORK'
                        ? 'Локальный сервер недоступен. Запустите backend на порту 8080.'
                        : 'Не удалось отправить код повторно.');
                return rejectWithValue({ status, message, retryAfterSeconds });
            }

            return rejectWithValue({ status: 500, message: 'Unknown error' });
        }
    },
);
