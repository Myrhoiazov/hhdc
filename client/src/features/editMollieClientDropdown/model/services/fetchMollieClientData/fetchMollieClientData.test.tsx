import { fetchMollieClientData } from './fetchMollieClientData';

const dispatch = jest.fn();
const extra = { apiPrivate: { get: jest.fn() } };

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.get.mockClear();
});

describe('fetchMollieClientData', () => {
    test('fetches the mollie customer and fulfills with it', async () => {
        const client = { id: '1' };
        extra.apiPrivate.get.mockResolvedValue({ data: client });

        const result = await fetchMollieClientData('1')(dispatch, () => ({}) as never, extra as never);

        expect(extra.apiPrivate.get).toHaveBeenCalledWith('/mollie/customers/edit-data/1');
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(client);
    });

    test('rejects when the response has no data', async () => {
        extra.apiPrivate.get.mockResolvedValue({ data: undefined });

        const result = await fetchMollieClientData('1')(dispatch, () => ({}) as never, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('unknown error');
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.get.mockRejectedValue(new Error('network error'));

        const result = await fetchMollieClientData('1')(dispatch, () => ({}) as never, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('unknown error');
    });
});
