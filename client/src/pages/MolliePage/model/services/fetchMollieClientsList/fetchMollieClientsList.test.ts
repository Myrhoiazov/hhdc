import { StateSchema } from '@/app/providers/StoreProvider';
import { fetchMollieClientsList } from './fetchMollieClientsList';

const dispatch = jest.fn();
const extra = { apiPrivate: { get: jest.fn() } };
const getState = () => ({}) as StateSchema;

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.get.mockClear();
});

describe('fetchMollieClientsList', () => {
    test('fetches clients with default paging', async () => {
        const response = {
            items: [{ id: '1' }], total: 1, page: 1, limit: 15, totalPages: 1,
        };
        extra.apiPrivate.get.mockResolvedValue({ data: response });

        const result = await fetchMollieClientsList({})(dispatch, getState, extra as never);

        expect(extra.apiPrivate.get).toHaveBeenCalledWith('/mollie/customers', {
            params: {
                _page: 1,
                _limit: 15,
                _q: undefined,
                hasSubscriptions: undefined,
                hasMandates: undefined,
                subscriptionStatus: undefined,
            },
        });
        expect(result.payload).toEqual(response);
    });

    test('passes through filters and trims the search query', async () => {
        extra.apiPrivate.get.mockResolvedValue({
            data: {
                items: [], total: 0, page: 2, limit: 10, totalPages: 1,
            },
        });

        await fetchMollieClientsList({
            page: 2, limit: 10, _q: '  ivan  ', hasSubscriptions: 'yes', hasMandates: 'no', subscriptionStatus: 'active',
        })(dispatch, getState, extra as never);

        expect(extra.apiPrivate.get).toHaveBeenCalledWith('/mollie/customers', {
            params: {
                _page: 2,
                _limit: 10,
                _q: 'ivan',
                hasSubscriptions: 'yes',
                hasMandates: 'no',
                subscriptionStatus: 'active',
            },
        });
    });

    test('drops "all" filter values', async () => {
        extra.apiPrivate.get.mockResolvedValue({
            data: {
                items: [], total: 0, page: 1, limit: 15, totalPages: 1,
            },
        });

        await fetchMollieClientsList({
            hasSubscriptions: 'all', hasMandates: 'all', subscriptionStatus: 'all',
        })(dispatch, getState, extra as never);

        expect(extra.apiPrivate.get).toHaveBeenCalledWith('/mollie/customers', expect.objectContaining({
            params: expect.objectContaining({
                hasSubscriptions: undefined, hasMandates: undefined, subscriptionStatus: undefined,
            }),
        }));
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.get.mockRejectedValue(new Error('network error'));

        const result = await fetchMollieClientsList({})(dispatch, getState, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });
});
