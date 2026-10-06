import { fromPartial } from '@total-typescript/shoehorn';
import { StateSchema } from '@/app/providers/StoreProvider';
import { TransactionSortField } from '@/entities/Transaction';
import { transactionsPageActions } from '../../slices/transactionsPageSlice';
import { initTransactionsPage } from './initTransactionsPage';

jest.mock('../fetchTransactionsList/fetchTransactionsList', () => ({
    fetchTransactionsList: jest.fn(() => ({ type: 'transactionsPage/fetchTransactionsList/mocked' })),
}));
jest.mock('../fetchTransactionsSummary/fetchTransactionsSummary', () => ({
    fetchTransactionsSummary: jest.fn(() => ({ type: 'summaryPage/fetchTransactionsSummary/mocked' })),
}));

const dispatch = jest.fn();
const extra = {};

function stateWith(inited: boolean): () => StateSchema {
    return () => fromPartial({ transactionPage: { _inited: inited } });
}

beforeEach(() => {
    dispatch.mockClear();
});

describe('initTransactionsPage', () => {
    test('reads filters from the URL, dispatches them and fetches the list and summary when not yet inited', async () => {
        const searchParams = new URLSearchParams('order=desc&sort=date&search=rent');

        await initTransactionsPage(searchParams)(dispatch, stateWith(false), extra as never);

        expect(dispatch).toHaveBeenCalledWith(transactionsPageActions.setOrder('desc'));
        expect(dispatch).toHaveBeenCalledWith(transactionsPageActions.setSort('date' as TransactionSortField));
        expect(dispatch).toHaveBeenCalledWith(transactionsPageActions.setSearch('rent'));
        expect(dispatch).toHaveBeenCalledWith(transactionsPageActions.initState());
        expect(dispatch).toHaveBeenCalledWith({ type: 'transactionsPage/fetchTransactionsList/mocked' });
        expect(dispatch).toHaveBeenCalledWith({ type: 'summaryPage/fetchTransactionsSummary/mocked' });
    });

    test('does nothing when already inited', async () => {
        const searchParams = new URLSearchParams('search=rent');

        await initTransactionsPage(searchParams)(dispatch, stateWith(true), extra as never);

        expect(dispatch).not.toHaveBeenCalledWith(transactionsPageActions.setSearch(expect.anything()));
        expect(dispatch).not.toHaveBeenCalledWith(transactionsPageActions.initState());
        expect(dispatch).not.toHaveBeenCalledWith({ type: 'transactionsPage/fetchTransactionsList/mocked' });
    });

    test('skips dispatching filters that are absent from the URL', async () => {
        const searchParams = new URLSearchParams();

        await initTransactionsPage(searchParams)(dispatch, stateWith(false), extra as never);

        expect(dispatch).not.toHaveBeenCalledWith(transactionsPageActions.setSearch(expect.anything()));
        expect(dispatch).toHaveBeenCalledWith(transactionsPageActions.initState());
    });
});
