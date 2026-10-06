import { StateSchema } from '@/app/providers/StoreProvider';
import { fetchCommentsByClientId } from './fetchCommentsByClientId';

const dispatch = jest.fn();
const extra = { apiPrivate: { get: jest.fn() } };
const getState = () => ({}) as StateSchema;

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.get.mockClear();
});

describe('fetchCommentsByClientId', () => {
    test('fetches comments for the given client', async () => {
        const comments = [{ id: 'c1', text: 'Nice' }];
        extra.apiPrivate.get.mockResolvedValue({ data: comments });

        const result = await fetchCommentsByClientId('1')(dispatch, getState, extra as never);

        expect(extra.apiPrivate.get).toHaveBeenCalledWith('/comments', {
            params: { entityId: '1', entityType: 'client', _expand: 'user' },
        });
        expect(result.payload).toEqual(comments);
    });

    test('rejects without calling the API when entityId is missing', async () => {
        const result = await fetchCommentsByClientId(undefined)(dispatch, getState, extra as never);

        expect(extra.apiPrivate.get).not.toHaveBeenCalled();
        expect(result.meta.requestStatus).toBe('rejected');
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.get.mockRejectedValue(new Error('network error'));

        const result = await fetchCommentsByClientId('1')(dispatch, getState, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });
});
