import { fromPartial } from '@total-typescript/shoehorn';
import { StateSchema } from '@/app/providers/StoreProvider';
import { User } from '@/entities/User';
import { Article } from '@/entities/Article';
import { RoleKey } from '@/entities/Role';
import { addCommentFormActions } from '../../slice/addCommentFormSlice';
import { sendComment } from './sendComment';

const dispatch = jest.fn();
const extra = { api: { post: jest.fn() } };

const user = { id: '1', username: 'denis', email: 'd@example.com', role: RoleKey.ADMIN };
const article = { id: '5', title: 'Title' };

function stateWith(overrides: Partial<{ authData: Partial<User>; articleData: Partial<Article>; text: string }> = {}): () => StateSchema {
    const { authData = user, articleData = article, text = 'hi' } = overrides;
    return () => fromPartial({
        user: { authData, _inited: true },
        articleDetails: { data: articleData },
        addCommentForm: { text },
    });
}

beforeEach(() => {
    dispatch.mockClear();
    extra.api.post.mockClear();
});

describe('sendComment', () => {
    test('posts the comment and clears the form text on success', async () => {
        const comment = { id: '1', text: 'hi' };
        extra.api.post.mockResolvedValue({ data: comment });

        const result = await sendComment()(dispatch, stateWith(), extra as never);

        expect(extra.api.post).toHaveBeenCalledWith('/comments', {
            articleId: article.id,
            userId: user.id,
            text: 'hi',
        });
        expect(dispatch).toHaveBeenCalledWith(addCommentFormActions.setText(''));
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(comment);
    });

    test('rejects without calling the API when the text is empty', async () => {
        const result = await sendComment()(dispatch, stateWith({ text: '' }), extra as never);

        expect(extra.api.post).not.toHaveBeenCalled();
        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('no data');
    });

    test('rejects when the API call fails', async () => {
        extra.api.post.mockRejectedValue(new Error('network error'));

        const result = await sendComment()(dispatch, stateWith(), extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });
});
