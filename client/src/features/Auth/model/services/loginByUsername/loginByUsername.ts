import { createAsyncThunk } from '@reduxjs/toolkit';
import { User, userActions } from '@/entities/User';
import { ThunkConfig } from '@/shared/lib/store/StateSchema';
import axios from 'axios';
import { csrfActions } from '@/shared/api/api';

interface LoginByEmailProps {
    email: string;
    password: string;
    captchaToken?: string;
}

export interface RequiresTwoFactorResponse {
    requiresTwoFactor: true;
    maskedEmail: string;
}

export interface SessionResponse {
    user: User;
    csrfToken: string;
}

export type LoginResponse = RequiresTwoFactorResponse | User;

export interface ServerError {
    status: number;
    message?: string;
    code?: string;
    siteKey?: string | null;
}

// The server explains a refusal in `error`: a code, a message and, for a captcha, the site key.
export const readServerError = (error: unknown, fallbackMessage: string): ServerError => {
    if (!axios.isAxiosError(error)) {
        return { status: 500, message: 'Unknown error' };
    }
    const details = error.response?.data?.error;
    const responseMessage = typeof details?.message === 'string' ? details.message : undefined;
    const message = responseMessage
        || (error.code === 'ERR_NETWORK'
            ? 'Локальный сервер недоступен. Запустите backend на порту 8080.'
            : fallbackMessage);
    return {
        status: error.response?.status || 500,
        message,
        code: typeof details?.code === 'string' ? details.code : undefined,
        siteKey: typeof details?.siteKey === 'string' ? details.siteKey : undefined,
    };
};

export const loginByUsername = createAsyncThunk<LoginResponse, LoginByEmailProps, ThunkConfig<ServerError>>(
    'login/loginByEmail',
    async (authData, thunkAPI) => {
        const { dispatch, extra, rejectWithValue, } = thunkAPI
        try {
            const response = await extra.api.post<{data: RequiresTwoFactorResponse | SessionResponse}>('/auth/login', authData);

            if (!response.data) {
                throw new Error('No data received');
            }

            const result = response.data.data;
            // A 2FA challenge is not a completed login — authData must stay empty
            // until /login/2fa/verify actually confirms the code.
            if ('requiresTwoFactor' in result) {
                return result;
            }

            csrfActions.set(result.csrfToken);
            dispatch(userActions.setAuthData(result.user));
            return result.user;

        } catch (error) {
            return rejectWithValue(readServerError(error, 'Не удалось выполнить вход. Проверьте сервер.'));
        }
    },
);
