import { fromPartial } from '@total-typescript/shoehorn';
import { StateSchema } from '@/app/providers/StoreProvider';
import { Month } from '@/entities/Month';
import { TransactionType } from '@/entities/TransactionType';
import { fetchTransactionsSummary } from './fetchTransactionsSummary';

const dispatch = jest.fn();
const extra = { apiPrivate: { get: jest.fn() } };

function stateWith(type: TransactionType, month: Month): () => StateSchema {
    return () => fromPartial({ transactionPage: { type, month } });
}

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.get.mockClear();
});

describe('fetchTransactionsSummary', () => {
    test('fetches the summary using the current type and month filters', async () => {
        const summary = { income: 100, expense: 50 };
        extra.apiPrivate.get.mockResolvedValue({ data: summary });

        const result = await fetchTransactionsSummary()(dispatch, stateWith(TransactionType.EXPENSE, Month.JANUARY), extra as never);

        expect(extra.apiPrivate.get).toHaveBeenCalledWith('/transactions/summary', {
            params: { _month: Month.JANUARY, _type: TransactionType.EXPENSE },
        });
        expect(result.payload).toEqual(summary);
    });

    test('sends null type when the filter is ALL', async () => {
        extra.apiPrivate.get.mockResolvedValue({ data: {} });

        await fetchTransactionsSummary()(dispatch, stateWith(TransactionType.ALL, Month.ALL), extra as never);

        expect(extra.apiPrivate.get).toHaveBeenCalledWith('/transactions/summary', {
            params: { _month: Month.ALL, _type: null },
        });
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.get.mockRejectedValue(new Error('network error'));

        const result = await fetchTransactionsSummary()(dispatch, stateWith(TransactionType.ALL, Month.ALL), extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });
});
