import { fetchCommentsByArticleId } from './fetchCommentsByArticleId';

const dispatch = jest.fn();
const extra = { api: { get: jest.fn() } };

beforeEach(() => {
    dispatch.mockClear();
    extra.api.get.mockClear();
});

describe('fetchCommentsByArticleId', () => {
    test('fetches comments for the given article id', async () => {
        const comments = [{ id: '1', text: 'hi' }];
        extra.api.get.mockResolvedValue({ data: comments });

        const result = await fetchCommentsByArticleId('1')(dispatch, () => ({}) as never, extra as never);

        expect(extra.api.get).toHaveBeenCalledWith('/comments', {
            params: { articleId: '1', _expand: 'user' },
        });
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(comments);
    });

    test('rejects without calling the API when articleId is missing', async () => {
        const result = await fetchCommentsByArticleId(undefined)(dispatch, () => ({}) as never, extra as never);

        expect(extra.api.get).not.toHaveBeenCalled();
        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });

    test('rejects when the API call fails', async () => {
        extra.api.get.mockRejectedValue(new Error('network error'));

        const result = await fetchCommentsByArticleId('1')(dispatch, () => ({}) as never, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });
});
