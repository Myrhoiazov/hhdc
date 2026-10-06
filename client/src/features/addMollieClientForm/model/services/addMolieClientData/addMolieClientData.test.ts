import { fromPartial } from '@total-typescript/shoehorn';
import { StateSchema } from '@/app/providers/StoreProvider';
import { addMolieClientData } from './addMolieClientData';

const dispatch = jest.fn();
const extra = { apiPrivate: { post: jest.fn() } };

const stateWithForm: StateSchema = fromPartial({
    addMollieClientForm: {
        data: {
            givenName: 'Иван',
            familyName: 'Петров',
            email: 'ivan@example.com',
            city: 'Amsterdam',
            consumerAccount: 'NL00TEST',
            consumerBic: 'TESTNL2A',
        },
    },
});

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.post.mockClear();
});

describe('addMolieClientData', () => {
    test('posts the client form and fulfills with the created Mollie customer', async () => {
        const mollieClient = { id: 'cst_1', name: 'Иван Петров' };
        extra.apiPrivate.post.mockResolvedValue({ data: mollieClient });

        const result = await addMolieClientData()(dispatch, () => stateWithForm, extra as never);

        expect(extra.apiPrivate.post).toHaveBeenCalledWith('/mollie/customers', {
            givenName: 'Иван',
            familyName: 'Петров',
            email: 'ivan@example.com',
        });
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(mollieClient);
    });

    test('rejects without calling the API when the client form is empty', async () => {
        const result = await addMolieClientData()(dispatch, () => ({} as StateSchema), extra as never);

        expect(extra.apiPrivate.post).not.toHaveBeenCalled();
        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('Форма клиента не заполнена');
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.post.mockRejectedValue(new Error('network error'));

        const result = await addMolieClientData()(dispatch, () => stateWithForm, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });
});
