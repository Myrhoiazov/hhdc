import { createAsyncThunk } from '@reduxjs/toolkit';
import { getUserAuthData } from '@/entities/User';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { getAddCommentFormText } from '../../selectors/getAddCommentFormSelectors';
import { getArticleDetailsData } from '@/entities/Article';
import { Comment } from '@/entities/Comment';
import { addCommentFormActions } from '../../slice/addCommentFormSlice';


export const sendComment = createAsyncThunk<Comment, void, ThunkConfig<string>>(
    'addCommentForm/sendComment',
    async (authData, thunkAPI) => {
        const { dispatch, extra, rejectWithValue, getState } = thunkAPI;

        const userData = getUserAuthData(getState());
        const text = getAddCommentFormText(getState());
        const artical = getArticleDetailsData(getState());

        if (!userData || !text || !artical) {
            return rejectWithValue('no data');
        }

        const comment = {
            articleId: artical.id,
            userId: userData.id,
            text
        }

        try {
            const response = await extra.api.post<Comment>('/comments', comment);

            if (!response.data) {
                throw new Error();
            }

            dispatch(addCommentFormActions.setText(''));

            return response.data;
        } catch (e) {
            return rejectWithValue('error');
        }
    },
);
