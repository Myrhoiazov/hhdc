import { fromPartial } from '@total-typescript/shoehorn';
import { StateSchema } from '@/app/providers/StoreProvider';
import { Month } from '@/entities/Month';
import { TransactionSortField } from '@/entities/Transaction';
import { TransactionType } from '@/entities/TransactionType';
import { fetchTransactionsList } from './fetchTransactionsList';

jest.mock('../fetchTransactionsSummary/fetchTransactionsSummary', () => ({
    fetchTransactionsSummary: jest.fn(() => ({ type: 'summaryPage/fetchTransactionsSummary/mocked' })),
}));

const dispatch = jest.fn();
const extra = { apiPrivate: { get: jest.fn() } };

function stateWith(overrides: Record<string, unknown> = {}): () => StateSchema {
    return () => fromPartial({
        transactionPage: {
            search: '',
            sort: TransactionSortField.DATE,
            order: 'asc',
            type: TransactionType.ALL,
            month: Month.ALL,
            page: 1,
            limit: 20,
            ...overrides,
        },
    });
}

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.get.mockClear();
});

describe('fetchTransactionsList', () => {
    test('fetches transactions using the current filters and refreshes the summary', async () => {
        const response = {
            items: [{ id: '1' }], total: 1, page: 1, limit: 20, totalPages: 1,
        };
        extra.apiPrivate.get.mockResolvedValue({ data: response });

        const result = await fetchTransactionsList({})(dispatch, stateWith({ search: 'rent' }), extra as never);

        expect(extra.apiPrivate.get).toHaveBeenCalledWith('/transactions', {
            params: {
                _q: 'rent',
                _sortBy: TransactionSortField.DATE,
                _order: 'asc',
                _month: Month.ALL,
                _type: null,
                _page: 1,
                _limit: 20,
            },
        });
        expect(dispatch).toHaveBeenCalledWith({ type: 'summaryPage/fetchTransactionsSummary/mocked' });
        expect(result.payload).toEqual(response);
    });

    test('sends the current page and limit from state', async () => {
        extra.apiPrivate.get.mockResolvedValue({
            data: {
                items: [], total: 0, page: 2, limit: 20, totalPages: 3,
            },
        });

        await fetchTransactionsList({})(dispatch, stateWith({ page: 2 }), extra as never);

        expect(extra.apiPrivate.get).toHaveBeenCalledWith('/transactions', expect.objectContaining({
            params: expect.objectContaining({ _page: 2, _limit: 20 }),
        }));
    });

    test('sends the type filter when it is not ALL', async () => {
        extra.apiPrivate.get.mockResolvedValue({
            data: {
                items: [], total: 0, page: 1, limit: 20, totalPages: 1,
            },
        });

        await fetchTransactionsList({})(dispatch, stateWith({ type: TransactionType.EXPENSE }), extra as never);

        expect(extra.apiPrivate.get).toHaveBeenCalledWith('/transactions', expect.objectContaining({
            params: expect.objectContaining({ _type: TransactionType.EXPENSE }),
        }));
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.get.mockRejectedValue(new Error('network error'));

        const result = await fetchTransactionsList({})(dispatch, stateWith(), extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });
});
