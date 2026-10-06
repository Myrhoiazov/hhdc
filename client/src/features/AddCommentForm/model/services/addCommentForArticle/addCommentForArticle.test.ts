import { fromPartial } from '@total-typescript/shoehorn';
import { StateSchema } from '@/app/providers/StoreProvider';
import { RoleKey } from '@/entities/Role';
import { addCommentForArticle } from './addCommentForArticle';

const dispatch = jest.fn();
const extra = { api: { post: jest.fn() } };

const user = { id: '1', username: 'denis', email: 'd@example.com', role: RoleKey.ADMIN };
const article = { id: '5', title: 'Title' };

function stateWith({ withUser = true, withArticle = true } = {}): () => StateSchema {
    return () => fromPartial({
        user: { authData: withUser ? user : undefined, _inited: true },
        articleDetails: { data: withArticle ? article : undefined },
    });
}

beforeEach(() => {
    dispatch.mockClear();
    extra.api.post.mockClear();
});

describe('addCommentForArticle', () => {
    test('posts the comment and refetches article comments on success', async () => {
        const comment = { id: '1', text: 'hi' };
        extra.api.post.mockResolvedValue({ data: comment });

        const result = await addCommentForArticle('hi')(dispatch, stateWith(), extra as never);

        expect(extra.api.post).toHaveBeenCalledWith('/comments', {
            articleId: article.id,
            userId: user.id,
            text: 'hi',
        });
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(comment);
    });

    test('rejects without calling the API when there is no authenticated user', async () => {
        const result = await addCommentForArticle('hi')(dispatch, stateWith({ withUser: false }), extra as never);

        expect(extra.api.post).not.toHaveBeenCalled();
        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('no data');
    });

    test('rejects without calling the API when there is no article', async () => {
        const result = await addCommentForArticle('hi')(dispatch, stateWith({ withArticle: false }), extra as never);

        expect(extra.api.post).not.toHaveBeenCalled();
        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('no data');
    });

    test('rejects when the API call fails', async () => {
        extra.api.post.mockRejectedValue(new Error('network error'));

        const result = await addCommentForArticle('hi')(dispatch, stateWith(), extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });
});
