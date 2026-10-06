import { deleteClientById } from './deleteClientById';

const dispatch = jest.fn();
const extra = { apiPrivate: { delete: jest.fn() } };

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.delete.mockClear();
});

describe('deleteClientById', () => {
    test('deletes the client and fulfills with the response payload', async () => {
        const message = { message: 'Client successfully deleted' };
        extra.apiPrivate.delete.mockResolvedValue({ data: message });

        const result = await deleteClientById()(dispatch, () => ({}) as never, extra as never);

        expect(extra.apiPrivate.delete).toHaveBeenCalledWith('/clients/undefined');
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(message);
    });

    test('rejects with a server error shape when the API call fails', async () => {
        extra.apiPrivate.delete.mockRejectedValue(new Error('network error'));

        const result = await deleteClientById()(dispatch, () => ({}) as never, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toEqual({ status: 500, message: 'Unknown error' });
    });
});
