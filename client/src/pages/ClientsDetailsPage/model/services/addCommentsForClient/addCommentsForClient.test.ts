import { fromPartial } from '@total-typescript/shoehorn';
import { StateSchema } from '@/app/providers/StoreProvider';
import { RoleKey } from '@/entities/Role';
import { User } from '@/entities/User';
import { Client } from '@/entities/Client';
import { addCommentsForClient } from './addCommentsForClient';

jest.mock('../fetchCommentsByClientId/fetchCommentsByClientId', () => ({
    fetchCommentsByClientId: jest.fn((id: string) => ({ type: 'clientDetails/fetchCommentsByClientId/mocked', id })),
}));

const dispatch = jest.fn();
const extra = { apiPrivate: { post: jest.fn() } };

function stateWith(userData: Partial<User> | undefined, client: Partial<Client> | undefined): () => StateSchema {
    return () => fromPartial({
        user: { authData: userData },
        clientDetails: { data: client },
    });
}

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.post.mockClear();
});

describe('addCommentsForClient', () => {
    const userData = { id: '1', username: 'denis', email: 'd@example.com', role: RoleKey.MANAGER };
    const client = { id: '2' };

    test('posts the comment and refetches the client comments', async () => {
        const created = { id: 'c1', text: 'Nice' };
        extra.apiPrivate.post.mockResolvedValue({ data: created });

        const result = await addCommentsForClient('Nice')(dispatch, stateWith(userData, client), extra as never);

        expect(extra.apiPrivate.post).toHaveBeenCalledWith('/comments', {
            clientId: client.id,
            userId: userData.id,
            text: 'Nice',
        });
        expect(dispatch).toHaveBeenCalledWith({ type: 'clientDetails/fetchCommentsByClientId/mocked', id: client.id });
        expect(result.payload).toEqual(created);
    });

    test('rejects without calling the API when there is no auth data', async () => {
        const result = await addCommentsForClient('Nice')(dispatch, stateWith(undefined, client), extra as never);

        expect(extra.apiPrivate.post).not.toHaveBeenCalled();
        expect(result.payload).toBe('no data');
    });

    test('rejects without calling the API when the text is empty', async () => {
        const result = await addCommentsForClient('')(dispatch, stateWith(userData, client), extra as never);

        expect(extra.apiPrivate.post).not.toHaveBeenCalled();
        expect(result.payload).toBe('no data');
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.post.mockRejectedValue(new Error('network error'));

        const result = await addCommentsForClient('Nice')(dispatch, stateWith(userData, client), extra as never);

        expect(result.payload).toBe('error');
    });
});
