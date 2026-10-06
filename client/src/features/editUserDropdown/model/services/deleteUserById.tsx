import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { IProfile } from '@/entities/Profile';

export const deleteUserById = createAsyncThunk<IProfile, string, ThunkConfig<string>>(
    'user/deleteUserById',
    async (userId, thunkAPI) => {
        const { extra, rejectWithValue } = thunkAPI;
        try {
            const response = await extra.apiPrivate.delete<IProfile>(`/users/${userId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue('delete');
        }
    }
);
