import { Provider } from 'react-redux';
import { act, renderHook } from '@testing-library/react';
import { createReduxStore } from '@/app/providers/StoreProvider';
import { TransactionSortField } from '@/entities/Transaction';
import { TransactionType } from '@/entities/TransactionType';
import { Month } from '@/entities/Month';
import { transactionsPageActions, transactionsPageReducer } from '../../model/slices/transactionsPageSlice';
import { useTransactionFilters } from './useTransactionFilters';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(() => new Promise(() => {})) },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

function renderWithStore() {
    const store = createReduxStore(undefined, { transactionPage: transactionsPageReducer } as never);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
    );
    return { store, ...renderHook(() => useTransactionFilters(), { wrapper }) };
}

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
});

describe('useTransactionFilters', () => {
    test('exposes the current filter values from state', () => {
        const { result } = renderWithStore();

        expect(result.current.search).toBe('');
        expect(result.current.sort).toBe(TransactionSortField.ID);
        expect(result.current.order).toBe('desc');
        expect(result.current.type).toBe(TransactionType.ALL);
        expect(result.current.month).toBe(Month.ALL);
    });

    test('onChangeSearch updates the search field and debounces the fetch', () => {
        const { result, store } = renderWithStore();

        act(() => {
            result.current.onChangeSearch('rent');
        });

        expect(store.getState().transactionPage!.search).toBe('rent');

        act(() => {
            jest.advanceTimersByTime(500);
        });

        expect(store.getState().transactionPage!.isLoading).toBe(true);
    });

    test('onChangeSort, onChangeOrder, onChangeType, onChangeMonth update state immediately', () => {
        const { result, store } = renderWithStore();

        act(() => {
            result.current.onChangeSort(TransactionSortField.CATEGORY);
            result.current.onChangeOrder('desc');
            result.current.onChangeType(TransactionType.EXPENSE);
            result.current.onChangeMonth(Month.JANUARY);
        });

        expect(store.getState().transactionPage!.sort).toBe(TransactionSortField.CATEGORY);
        expect(store.getState().transactionPage!.order).toBe('desc');
        expect(store.getState().transactionPage!.type).toBe(TransactionType.EXPENSE);
        expect(store.getState().transactionPage!.month).toBe(Month.JANUARY);
    });

    test('changing a filter resets the page back to 1', () => {
        const { result, store } = renderWithStore();

        act(() => {
            store.dispatch(transactionsPageActions.setPage(3));
        });

        act(() => {
            result.current.onChangeSort(TransactionSortField.CATEGORY);
        });

        expect(store.getState().transactionPage!.page).toBe(1);
    });
});
