import { deleteSubscriptionById } from './deleteSubscriptionById';

const dispatch = jest.fn();
const extra = { apiPrivate: { delete: jest.fn() } };

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.delete.mockClear();
});

describe('deleteSubscriptionById', () => {
    test('deletes the subscription and fulfills with the response payload', async () => {
        const subscription = { id: 'sub_1' };
        extra.apiPrivate.delete.mockResolvedValue({ data: subscription });

        const result = await deleteSubscriptionById({ customerId: '1', subscriptionId: 'sub_1' })(
            dispatch,
            () => ({}) as never,
            extra as never,
        );

        expect(extra.apiPrivate.delete).toHaveBeenCalledWith('/mollie/subscriptions/sub_1', {
            data: { customerId: 1 },
        });
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(subscription);
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.delete.mockRejectedValue(new Error('network error'));

        const result = await deleteSubscriptionById({ customerId: 'cst_1', subscriptionId: 'sub_1' })(
            dispatch,
            () => ({}) as never,
            extra as never,
        );

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('delete');
    });
});
