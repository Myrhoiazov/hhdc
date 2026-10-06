import { fetchMollieClientsList } from './fetchMollieClientsList';

const dispatch = jest.fn();
const extra = { apiPrivate: { get: jest.fn() } };

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.get.mockClear();
});

describe('fetchMollieClientsList (createMollieMandateForm)', () => {
    test('fetches the customers list and fulfills with it', async () => {
        const customers = [{ id: '1' }];
        extra.apiPrivate.get.mockResolvedValue({ data: customers });

        const result = await fetchMollieClientsList({})(dispatch, () => ({}) as never, extra as never);

        expect(extra.apiPrivate.get).toHaveBeenCalledWith('/mollie/customers');
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(customers);
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.get.mockRejectedValue(new Error('network error'));

        const result = await fetchMollieClientsList({})(dispatch, () => ({}) as never, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });
});
