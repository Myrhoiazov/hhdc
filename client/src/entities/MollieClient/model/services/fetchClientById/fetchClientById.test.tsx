import { fetchClientById } from './fetchClientById';

const dispatch = jest.fn();
const extra = { apiPrivate: { get: jest.fn() } };

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.get.mockClear();
});

describe('MollieClient fetchClientById', () => {
    test('fetches the mollie client and fulfills with it', async () => {
        const client = { id: '1', name: 'Client B.V.' };
        extra.apiPrivate.get.mockResolvedValue({ data: client });

        const result = await fetchClientById('1')(dispatch, () => ({}) as never, extra as never);

        expect(extra.apiPrivate.get).toHaveBeenCalledWith('/mollie/customers/1');
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(client);
    });

    test('rejects when the response has no data', async () => {
        extra.apiPrivate.get.mockResolvedValue({ data: undefined });

        const result = await fetchClientById('1')(dispatch, () => ({}) as never, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('some error');
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.get.mockRejectedValue(new Error('network error'));

        const result = await fetchClientById('1')(dispatch, () => ({}) as never, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('some error');
    });
});
