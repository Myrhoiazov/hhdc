import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import axios from 'axios';
import { ChangePasswordError, ChangePasswordFormData } from '../types/changePassword';

interface ChangePasswordArgs extends ChangePasswordFormData {
    profileId: string;
}

export const changePasswordThunk = createAsyncThunk<
    void,
    ChangePasswordArgs,
    ThunkConfig<ChangePasswordError[]>
>(
    'changePassword/changePassword',
    async ({ profileId, currentPassword, newPassword, confirmPassword }, thunkApi) => {
        const { extra, rejectWithValue } = thunkApi;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return rejectWithValue([ChangePasswordError.REQUIRED_FIELDS]);
        }

        if (newPassword !== confirmPassword) {
            return rejectWithValue([ChangePasswordError.PASSWORDS_DONT_MATCH]);
        }

        try {
            await extra.apiPrivate.put(`/profile/${profileId}/password`, {
                currentPassword,
                newPassword,
            });
        } catch (e) {
            if (axios.isAxiosError(e) && e.response?.status === 400) {
                return rejectWithValue([ChangePasswordError.CURRENT_PASSWORD_INCORRECT]);
            }
            return rejectWithValue([ChangePasswordError.SERVER_ERROR]);
        }
    }
);
