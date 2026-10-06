import { fromPartial } from '@total-typescript/shoehorn';
import { StateSchema } from '@/app/providers/StoreProvider';
import { addNewUser } from './addNewUser';

const dispatch = jest.fn();
const extra = { apiPrivate: { post: jest.fn() } };

const stateWithForm: StateSchema = fromPartial({
    newUser: {
        data: {
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@example.com',
        },
    },
});

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.post.mockClear();
});

describe('addNewUser', () => {
    test('posts the filled form and fulfills with the created user', async () => {
        const profile = { id: 1, firstName: 'Admin', lastName: 'User' };
        extra.apiPrivate.post.mockResolvedValue({ data: profile });

        const result = await addNewUser()(dispatch, () => stateWithForm, extra as never);

        expect(extra.apiPrivate.post).toHaveBeenCalledWith('/users', stateWithForm.newUser?.data);
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(profile);
    });

    test('rejects without calling the API when the user form is empty', async () => {
        const result = await addNewUser()(dispatch, () => ({} as StateSchema), extra as never);

        expect(extra.apiPrivate.post).not.toHaveBeenCalled();
        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('Форма пользователя не заполнена');
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.post.mockRejectedValue(new Error('network error'));

        const result = await addNewUser()(dispatch, () => stateWithForm, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });
});
