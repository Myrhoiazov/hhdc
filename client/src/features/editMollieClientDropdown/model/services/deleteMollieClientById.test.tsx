import { deleteMollieClientById } from './deleteMollieClientById';

const dispatch = jest.fn();
const extra = { apiPrivate: { delete: jest.fn() } };

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.delete.mockClear();
});

describe('deleteMollieClientById', () => {
    test('deletes the mollie client and fulfills with the response payload', async () => {
        const client = { id: '1' };
        extra.apiPrivate.delete.mockResolvedValue({ data: client });

        const result = await deleteMollieClientById('1')(dispatch, () => ({}) as never, extra as never);

        expect(extra.apiPrivate.delete).toHaveBeenCalledWith('/mollie/customers/1');
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(client);
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.delete.mockRejectedValue(new Error('network error'));

        const result = await deleteMollieClientById('1')(dispatch, () => ({}) as never, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('delete');
    });

    test('rejects with a dedicated reason when the server refuses because of active dependencies', async () => {
        extra.apiPrivate.delete.mockRejectedValue({ isAxiosError: true, response: { status: 409 } });

        const result = await deleteMollieClientById('1')(dispatch, () => ({}) as never, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('has-dependencies');
    });
});
