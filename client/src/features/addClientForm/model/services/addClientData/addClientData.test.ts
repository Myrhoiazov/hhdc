import { fromPartial } from '@total-typescript/shoehorn';
import { StateSchema } from '@/app/providers/StoreProvider';
import { addClientData } from './addClientData';

const dispatch = jest.fn();
const extra = { apiPrivate: { post: jest.fn() } };

const stateWithForm: StateSchema = fromPartial({
    client: {
        form: {
            firstName: 'Иван',
            lastName: 'Петров',
            branchId: 1,
        },
    },
});

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.post.mockClear();
});

describe('addClientData', () => {
    test('posts the filled form and fulfills with the created client', async () => {
        const client = { id: 1, firstName: 'Иван', lastName: 'Петров' };
        extra.apiPrivate.post.mockResolvedValue({ data: client });

        const result = await addClientData({ groupIds: [2, 3] })(
            dispatch,
            () => stateWithForm,
            extra as never,
        );

        expect(extra.apiPrivate.post).toHaveBeenCalledWith('/clients', expect.any(FormData), expect.any(Object));
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(client);
    });

    test('rejects without calling the API when the client form is empty', async () => {
        const result = await addClientData({ groupIds: [] })(
            dispatch,
            () => ({} as StateSchema),
            extra as never,
        );

        expect(extra.apiPrivate.post).not.toHaveBeenCalled();
        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('Форма клиента не заполнена');
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.post.mockRejectedValue(new Error('network error'));

        const result = await addClientData({ groupIds: [] })(
            dispatch,
            () => stateWithForm,
            extra as never,
        );

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });
});
