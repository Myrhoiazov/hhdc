import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { IProfile } from '@/entities/Profile';

interface FetchArticlesListProps {
    replace?: boolean;
    noQuery?: boolean
}


export const fetchUsersList = createAsyncThunk<
    IProfile[],
    void,
    ThunkConfig<string>
>(
    'settingsPage/fetchUsersList',
    async (_, thunkApi) => {
        const { extra, rejectWithValue, getState } = thunkApi;
        try {
            const { data } = await extra.apiPrivate.get<IProfile[]>('/users');

            if (!data) {
                throw new Error();
            }

            return data;
        } catch (e) {
            return rejectWithValue('error');
        }
    },
);
