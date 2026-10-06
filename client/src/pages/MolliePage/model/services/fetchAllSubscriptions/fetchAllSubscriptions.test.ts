import { StateSchema } from '@/app/providers/StoreProvider';
import { fetchAllSubscriptions } from './fetchAllSubscriptions';

const dispatch = jest.fn();
const extra = { apiPrivate: { get: jest.fn() } };
const getState = () => ({}) as StateSchema;

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.get.mockClear();
});

describe('fetchAllSubscriptions', () => {
    test('fetches subscriptions for the given customer', async () => {
        const subscriptions = [{ id: '1' }];
        extra.apiPrivate.get.mockResolvedValue({ data: subscriptions });

        const result = await fetchAllSubscriptions({ customerId: 'cst_1' })(dispatch, getState, extra as never);

        expect(extra.apiPrivate.get).toHaveBeenCalledWith('/mollie/customers/cst_1/subscriptions');
        expect(result.payload).toEqual(subscriptions);
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.get.mockRejectedValue(new Error('network error'));

        const result = await fetchAllSubscriptions({ customerId: 'cst_1' })(dispatch, getState, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });
});
