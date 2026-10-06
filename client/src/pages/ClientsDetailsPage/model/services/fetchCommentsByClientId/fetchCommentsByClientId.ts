import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { Comment } from '@/entities/Comment';

export const fetchCommentsByClientId = createAsyncThunk<
    Comment[],
    string | undefined,
    ThunkConfig<string>
>(
    'clientDetails/fetchCommentsByClientId',
    async (entityId, thunkApi) => {
        const { extra, rejectWithValue } = thunkApi;

        if (!entityId) {
            return rejectWithValue('error');
        }

        try {
            const { data } = await extra.apiPrivate.get<Comment[]>('/comments', {
                params: {
                    entityId,
                    entityType: 'client',
                    _expand: 'user',
                },
            });

            if (!data) {
                throw new Error();
            }

            return data;
        } catch (e) {
            return rejectWithValue('error');
        }
    },
);
