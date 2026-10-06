import { fromPartial } from '@total-typescript/shoehorn';
import { StateSchema } from '@/app/providers/StoreProvider';
import { TransactionType } from '@/entities/TransactionType';
import { PaymentMethod } from '@/entities/PaymentMethod';
import { TransactionCategory } from '@/entities/TransactionCategory';
import { createTransaction } from './createTransaction';

const dispatch = jest.fn();
const extra = { apiPrivate: { post: jest.fn() } };

function stateWith(data: Record<string, unknown> | undefined): () => StateSchema {
    return () => fromPartial({ addTransactionForm: { data } });
}

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.post.mockClear();
});

describe('createTransaction', () => {
    test('maps enums and posts the transaction on success', async () => {
        const created = { id: '1' };
        extra.apiPrivate.post.mockResolvedValue({ data: created });
        const form = {
            amount: 100,
            type: TransactionType.EXPENSE,
            paymentMethod: PaymentMethod.CARD,
            category: TransactionCategory.AUTO,
        };

        const result = await createTransaction()(dispatch, stateWith(form), extra as never);

        expect(extra.apiPrivate.post).toHaveBeenCalledWith('/transactions', {
            ...form,
            type: 'EXPENSE',
            paymentMethod: 'card',
            category: 'AUTO',
        });
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(created);
    });

    test('rejects without calling the API when the form is empty', async () => {
        const result = await createTransaction()(dispatch, stateWith(undefined), extra as never);

        expect(extra.apiPrivate.post).not.toHaveBeenCalled();
        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.post.mockRejectedValue(new Error('network error'));

        const result = await createTransaction()(dispatch, stateWith({ amount: 1 }), extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });
});
