import { createAsyncThunk } from '@reduxjs/toolkit';
import { getUserAuthData } from '@/entities/User';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { Comment } from '@/entities/Comment';
import { getClientDetailsData } from '@/entities/Client';
import { fetchCommentsByClientId } from '../../services/fetchCommentsByClientId/fetchCommentsByClientId';

export const addCommentsForClient = createAsyncThunk<
    Comment,
    string,
    ThunkConfig<string>
>('clientDetails/addCommentForClient', async (text, thunkApi) => {
    const { extra, dispatch, rejectWithValue, getState } = thunkApi;

    const userData = getUserAuthData(getState());
    const client = getClientDetailsData(getState());

    if (!userData || !text || !client) {
        return rejectWithValue('no data');
    }

    try {
        const response = await extra.apiPrivate.post<Comment>('/comments', {
            clientId: client.id,
            userId: userData.id,
            text,
        });

        if (!response.data) {
            throw new Error();
        }

        dispatch(fetchCommentsByClientId(client.id));

        return response.data;
    } catch (e) {
        return rejectWithValue('error');
    }
});
