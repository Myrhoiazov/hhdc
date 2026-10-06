import { fetchClientById } from './fetchClientById';

const dispatch = jest.fn();
const extra = { apiPrivate: { get: jest.fn() } };

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.get.mockClear();
});

describe('fetchClientById', () => {
    test('fetches the client and fulfills with it', async () => {
        const client = { id: '1', firstName: 'Иван' };
        extra.apiPrivate.get.mockResolvedValue({ data: client });

        const result = await fetchClientById('1')(dispatch, () => ({}) as never, extra as never);

        expect(extra.apiPrivate.get).toHaveBeenCalledWith('/clients/1');
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(client);
    });

    test('rejects with a server error shape when the API call fails', async () => {
        extra.apiPrivate.get.mockRejectedValue(new Error('network error'));

        const result = await fetchClientById('1')(dispatch, () => ({}) as never, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toEqual({ status: 500, message: 'Unknown error' });
    });
});
