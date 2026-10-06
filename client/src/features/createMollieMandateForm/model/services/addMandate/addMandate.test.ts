import { fromPartial } from '@total-typescript/shoehorn';
import { StateSchema } from '@/app/providers/StoreProvider';
import { addMandate } from './addMandate';

const dispatch = jest.fn();
const extra = { apiPrivate: { post: jest.fn() } };

function stateWith(data: Record<string, unknown> | undefined): () => StateSchema {
    return () => fromPartial({ createMollieMandateForm: { data } });
}

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.post.mockClear();
});

describe('addMandate', () => {
    test('posts the mandate form and refetches the customer list on success', async () => {
        const mandate = { id: 'mnd_1' };
        extra.apiPrivate.post.mockResolvedValue({ data: mandate });
        const form = { customerId: '1', method: 'directdebit' };

        const result = await addMandate()(dispatch, stateWith(form), extra as never);

        expect(extra.apiPrivate.post).toHaveBeenCalledWith('/mollie/mandates', form);
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(mandate);
    });

    test('rejects without calling the API when the form is empty', async () => {
        const result = await addMandate()(dispatch, stateWith(undefined), extra as never);

        expect(extra.apiPrivate.post).not.toHaveBeenCalled();
        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('Форма записи не заполнена');
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.post.mockRejectedValue(new Error('network error'));

        const result = await addMandate()(dispatch, stateWith({ customerId: '1' }), extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });
});
