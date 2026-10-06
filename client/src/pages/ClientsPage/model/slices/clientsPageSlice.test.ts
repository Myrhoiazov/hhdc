import { ClientSortField, ClientView } from '@/entities/Client';
import { CLIENT_VIEW_LOCALSTORAGE_KEY } from '@/shared/const/localstorage';
import { fetchClientsList } from '../services/fetchClientsList/fetchClientsList';
import { clientsPageActions, clientsPageReducer } from './clientsPageSlice';

describe('clientsPageSlice', () => {
    const initialState = clientsPageReducer(undefined, { type: 'init' });

    test('setView updates the view and persists it to localStorage', () => {
        const state = clientsPageReducer(initialState, clientsPageActions.setView(ClientView.SMALL));

        expect(state.view).toBe(ClientView.SMALL);
        expect(localStorage.getItem(CLIENT_VIEW_LOCALSTORAGE_KEY)).toBe(ClientView.SMALL);
    });

    test('setSearch, setSort, setOrder, setPage, setBranchId, setPaymentStatus update their fields', () => {
        let state = clientsPageReducer(initialState, clientsPageActions.setSearch('ivan'));
        state = clientsPageReducer(state, clientsPageActions.setSort(ClientSortField.TITLE));
        state = clientsPageReducer(state, clientsPageActions.setOrder('desc'));
        state = clientsPageReducer(state, clientsPageActions.setPage(3));
        state = clientsPageReducer(state, clientsPageActions.setBranchId('2'));
        state = clientsPageReducer(state, clientsPageActions.setPaymentStatus('paid'));

        expect(state.search).toBe('ivan');
        expect(state.sort).toBe(ClientSortField.TITLE);
        expect(state.order).toBe('desc');
        expect(state.page).toBe(3);
        expect(state.branchId).toBe('2');
        expect(state.paymentStatus).toBe('paid');
    });

    test('initState reads the persisted view and marks the slice as inited', () => {
        localStorage.setItem(CLIENT_VIEW_LOCALSTORAGE_KEY, ClientView.SMALL);

        const state = clientsPageReducer(initialState, clientsPageActions.initState());

        expect(state.view).toBe(ClientView.SMALL);
        expect(state._inited).toBe(true);
    });

    test('fetchClientsList.pending resets the error and sets loading', () => {
        const state = clientsPageReducer(
            { ...initialState, error: 'error' },
            fetchClientsList.pending('id', {}),
        );

        expect(state.isLoading).toBe(true);
        expect(state.error).toBeUndefined();
    });

    test('fetchClientsList.fulfilled replaces the list when replace is set', () => {
        const state = clientsPageReducer(
            { ...initialState, ids: ['1'], entities: { 1: { id: '1' } } } as never,
            fetchClientsList.fulfilled([{ id: '2' }] as never, 'id', { replace: true }),
        );

        expect(state.ids).toEqual(['2']);
        expect(state.isLoading).toBe(false);
    });

    test('fetchClientsList.fulfilled appends clients when replace is not set', () => {
        const state = clientsPageReducer(
            { ...initialState, ids: ['1'], entities: { 1: { id: '1' } } } as never,
            fetchClientsList.fulfilled([{ id: '2' }] as never, 'id', {}),
        );

        expect(state.ids).toEqual(['1', '2']);
    });

    test('fetchClientsList.fulfilled sets hasMore to false when fewer than limit clients are returned', () => {
        const state = clientsPageReducer(
            { ...initialState, limit: 9 },
            fetchClientsList.fulfilled([{ id: '1' }] as never, 'id', {}),
        );

        expect(state.hasMore).toBe(false);
    });

    test('fetchClientsList.rejected stores the error', () => {
        const state = clientsPageReducer(
            initialState,
            fetchClientsList.rejected(new Error('fail'), 'id', {}, 'error'),
        );

        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('error');
    });
});
