import { fromPartial } from '@total-typescript/shoehorn';
import { StateSchema } from '@/app/providers/StoreProvider';
import { updateMollieClientData } from './updateMollieClientData';

const dispatch = jest.fn();
const extra = { apiPrivate: { put: jest.fn() } };

function stateWith(form: Record<string, unknown> | undefined): () => StateSchema {
    return () => fromPartial({ mollieClientForm: { form } });
}

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.put.mockClear();
});

describe('updateMollieClientData', () => {
    test('sends only the editable fields present in the form', async () => {
        const updated = { id: '1', email: 'a@b.com' };
        extra.apiPrivate.put.mockResolvedValue({ data: updated });
        const form = { id: '1', email: 'a@b.com', givenName: 'Ivan', notEditableField: 'ignored' };

        const result = await updateMollieClientData()(dispatch, stateWith(form), extra as never);

        expect(extra.apiPrivate.put).toHaveBeenCalledWith('/mollie/customers/1', {
            email: 'a@b.com',
            givenName: 'Ivan',
        });
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(updated);
    });

    test('rejects without calling the API when the form has no id', async () => {
        const result = await updateMollieClientData()(dispatch, stateWith({ email: 'a@b.com' }), extra as never);

        expect(extra.apiPrivate.put).not.toHaveBeenCalled();
        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('Customer ID is required');
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.put.mockRejectedValue(new Error('network error'));

        const result = await updateMollieClientData()(dispatch, stateWith({ id: '1' }), extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error validation');
    });
});
