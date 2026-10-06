import {
    createEntityAdapter,
    createSlice, PayloadAction,
} from '@reduxjs/toolkit';

import { Comment } from '@/entities/Comment';
import { StateSchema } from '@/app/providers/StoreProvider';
import { ClientDetailsCommentsSchema } from '../types/ClientDetailsCommentsSchema';
import { fetchCommentsByClientId } from '../services/fetchCommentsByClientId/fetchCommentsByClientId';

const commentsAdapter = createEntityAdapter<Comment, string>({
    selectId: (comment) => comment.id,
});

export const getClientComments = commentsAdapter.getSelectors<StateSchema>(
    (state) => state.clientDetailsComments || commentsAdapter.getInitialState(),
);

const clientDetailsCommentsSlice = createSlice({
    name: 'clientDetailsCommentsSlice',
    initialState: commentsAdapter.getInitialState<ClientDetailsCommentsSchema>({
        isLoading: false,
        error: undefined,
        ids: [],
        entities: {},
    }),
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchCommentsByClientId.pending, (state) => {
                state.error = undefined;
                state.isLoading = true;
            })
            .addCase(fetchCommentsByClientId.fulfilled, (
                state,
                action: PayloadAction<Comment[]>,
            ) => {
                state.isLoading = false;
                commentsAdapter.setAll(state, action.payload);
            })
            .addCase(fetchCommentsByClientId.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    },
});

export const { reducer: clientDetailsCommentsReducer } = clientDetailsCommentsSlice;
