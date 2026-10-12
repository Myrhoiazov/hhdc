import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { readServerError, ServerError } from '../loginByUsername/loginByUsername';

interface ResendServerError extends ServerError {
    retryAfterSeconds?: number;
}

const retryAfterSecondsOf = (error: unknown): number | undefined => {
    if (!axios.isAxiosError(error)) return undefined;
    const retryAfterHeader = error.response?.headers?.['retry-after'];
    return typeof retryAfterHeader === 'string' ? Number(retryAfterHeader) : undefined;
};

export const resendTwoFactorCode = createAsyncThunk<void, void, ThunkConfig<ResendServerError>>(
    'login/resendTwoFactorCode',
    async (_, thunkAPI) => {
        const { extra, rejectWithValue } = thunkAPI;
        try {
            await extra.api.post('/auth/login/2fa/resend');
        } catch (error) {
            return rejectWithValue({
                ...readServerError(error, 'Не удалось отправить код повторно.'),
                retryAfterSeconds: retryAfterSecondsOf(error),
            });
        }
    },
);
