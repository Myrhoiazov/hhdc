import { fromPartial } from '@total-typescript/shoehorn';
import { StateSchema } from '@/app/providers/StoreProvider';
import { addSubscription } from './addSubscription';

const dispatch = jest.fn();
const extra = { apiPrivate: { post: jest.fn() } };

function stateWith(data: Record<string, unknown> | undefined): () => StateSchema {
    return () => fromPartial({ addMollieSubscriptionForm: { data } });
}

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.post.mockClear();
});

describe('addSubscription', () => {
    test('posts the subscription form and fulfills with the created subscription', async () => {
        const subscription = { id: 'sub_1' };
        extra.apiPrivate.post.mockResolvedValue({ data: subscription });
        const form = { customerId: '1', amount: '10.00' };

        const result = await addSubscription()(dispatch, stateWith(form), extra as never);

        expect(extra.apiPrivate.post).toHaveBeenCalledWith('/mollie/mandates/1/subscriptions', form);
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(subscription);
    });

    test('rejects without calling the API when the form is empty', async () => {
        const result = await addSubscription()(dispatch, stateWith(undefined), extra as never);

        expect(extra.apiPrivate.post).not.toHaveBeenCalled();
        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('Форма записи не заполнена');
    });

    test('rejects when the response has no data', async () => {
        extra.apiPrivate.post.mockResolvedValue({ data: undefined });

        const result = await addSubscription()(dispatch, stateWith({ customerId: '1' }), extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.post.mockRejectedValue(new Error('network error'));

        const result = await addSubscription()(dispatch, stateWith({ customerId: '1' }), extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });
});
