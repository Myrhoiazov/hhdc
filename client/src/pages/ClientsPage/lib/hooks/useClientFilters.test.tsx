import { Provider } from 'react-redux';
import { act, renderHook } from '@testing-library/react';
import { createReduxStore } from '@/app/providers/StoreProvider';
import { clientsPageReducer } from '../../model/slices/clientsPageSlice';
import { ClientSortField } from '@/entities/Client';
import { useClientFilters } from './useClientFilters';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(() => new Promise(() => {})) },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

function renderWithStore() {
    const store = createReduxStore(undefined, { clientsPage: clientsPageReducer } as never);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
    );
    return { store, ...renderHook(() => useClientFilters(), { wrapper }) };
}

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
});

describe('useClientFilters', () => {
    test('exposes the current filter values from state', () => {
        const { result } = renderWithStore();

        expect(result.current.search).toBe('');
        expect(result.current.sort).toBe(ClientSortField.CREATED);
        expect(result.current.order).toBe('asc');
        expect(result.current.branchId).toBe('all');
        expect(result.current.paymentStatus).toBe('all');
    });

    test('onChangeSearch updates the search field and debounces the fetch', () => {
        const { result, store } = renderWithStore();

        act(() => {
            result.current.onChangeSearch('ivan');
        });

        expect(store.getState().clientsPage!.search).toBe('ivan');

        act(() => {
            jest.advanceTimersByTime(500);
        });

        expect(store.getState().clientsPage!.isLoading).toBe(true);
    });

    test('onChangeSort, onChangeOrder, onChangeBranch, onChangePaymentStatus update state immediately', () => {
        const { result, store } = renderWithStore();

        act(() => {
            result.current.onChangeSort(ClientSortField.TITLE);
            result.current.onChangeOrder('desc');
            result.current.onChangeBranch('2');
            result.current.onChangePaymentStatus('paid');
        });

        expect(store.getState().clientsPage!.sort).toBe(ClientSortField.TITLE);
        expect(store.getState().clientsPage!.order).toBe('desc');
        expect(store.getState().clientsPage!.branchId).toBe('2');
        expect(store.getState().clientsPage!.paymentStatus).toBe('paid');
    });
});
