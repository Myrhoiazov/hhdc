import { fetchCommentsByClientId } from '../services/fetchCommentsByClientId/fetchCommentsByClientId';
import { clientDetailsCommentsReducer } from './clientDetailsCommentsSlice';

describe('clientDetailsCommentsSlice', () => {
    const initialState = clientDetailsCommentsReducer(undefined, { type: 'init' });

    test('pending resets the error and sets loading', () => {
        const state = clientDetailsCommentsReducer(
            { ...initialState, error: 'error' },
            fetchCommentsByClientId.pending('id', '1'),
        );

        expect(state.isLoading).toBe(true);
        expect(state.error).toBeUndefined();
    });

    test('fulfilled stores the comments', () => {
        const state = clientDetailsCommentsReducer(
            initialState,
            fetchCommentsByClientId.fulfilled([{ id: 'c1', text: 'Nice' }] as never, 'id', '1'),
        );

        expect(state.isLoading).toBe(false);
        expect(state.ids).toEqual(['c1']);
        expect(state.entities.c1).toEqual({ id: 'c1', text: 'Nice' });
    });

    test('rejected stores the error', () => {
        const state = clientDetailsCommentsReducer(
            initialState,
            fetchCommentsByClientId.rejected(new Error('fail'), 'id', '1', 'error'),
        );

        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('error');
    });
});
