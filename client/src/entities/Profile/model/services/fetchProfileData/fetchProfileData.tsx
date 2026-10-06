import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { IProfile, ServerError } from '../../types/profile';

export const fetchProfileData = createAsyncThunk<IProfile, string, ThunkConfig<ServerError>>(
    'profile/fetchProfileData',
    async (profileId, thunkAPI) => {
        const { extra, rejectWithValue } = thunkAPI;
        try {
            const response = await extra.apiPrivate.get<IProfile>(`/users/${profileId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue({ status: 500, message: 'Unknown error' });
        }
    }
);
