import { createAsyncThunk } from '@reduxjs/toolkit';
import { User, userActions } from '@/entities/User';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import axios from 'axios';

interface LoginByEmailProps {
    email: string;
    password: string;
    captchaToken?: string;
}

export interface RequiresTwoFactorResponse {
    requiresTwoFactor: true;
    maskedEmail: string;
}

export type LoginResponse = RequiresTwoFactorResponse | User;

export interface ServerError {
    status: number;
    message?: string;
    code?: string;
    siteKey?: string | null;
}

export const loginByUsername = createAsyncThunk<LoginResponse, LoginByEmailProps, ThunkConfig<ServerError>>(
    'login/loginByEmail',
    async (authData, thunkAPI) => {
        const { dispatch, extra, rejectWithValue, } = thunkAPI
        try {
            const response = await extra.api.post<LoginResponse>('/auth/login', authData);

            if (!response.data) {
                throw new Error('No data received');
            }

            // A 2FA challenge is not a completed login — authData must stay empty
            // until /login/2fa/verify actually confirms the code.
            if (!('requiresTwoFactor' in response.data)) {
                dispatch(userActions.setAuthData(response.data));
            }

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
                        : 'Не удалось выполнить вход. Проверьте сервер.');
                const code = typeof error.response?.data?.code === 'string'
                    ? error.response.data.code
                    : undefined;
                const siteKey = typeof error.response?.data?.siteKey === 'string'
                    ? error.response.data.siteKey
                    : undefined;
                return rejectWithValue({ status, message, code, siteKey });
            }

            return rejectWithValue({ status: 500, message: 'Unknown error' });
        }
    },
);
