import { fetchAllMandates } from '../services/fetchAllMandates/fetchAllMandates';
import { fetchAllSubscriptions } from '../services/fetchAllSubscriptions/fetchAllSubscriptions';
import { fetchMollieClientsList } from '../services/fetchMollieClientsList/fetchMollieClientsList';
import { mollieClientsPageSliceActions, mollieClientsPageSliceReducer } from './mollieClientsDetailsPageSlice';

describe('mollieClientsPageSlice', () => {
    const initialState = mollieClientsPageSliceReducer(undefined, { type: 'init' });

    test('initState marks the slice as inited', () => {
        const state = mollieClientsPageSliceReducer(initialState, mollieClientsPageSliceActions.initState());

        expect(state._inited).toBe(true);
    });

    test('fetchMollieClientsList.pending resets the error and sets loading', () => {
        const state = mollieClientsPageSliceReducer(
            { ...initialState, error: 'error' },
            fetchMollieClientsList.pending('id', {}),
        );

        expect(state.isLoading).toBe(true);
        expect(state.error).toBeUndefined();
    });

    test('fetchMollieClientsList.fulfilled replaces the list and stores paging when replace is set', () => {
        const state = mollieClientsPageSliceReducer(
            { ...initialState, ids: ['1'], entities: { 1: { id: '1' } } } as never,
            fetchMollieClientsList.fulfilled({
                items: [{ id: '2' }], total: 1, page: 2, limit: 15, totalPages: 1,
            } as never, 'id', { replace: true }),
        );

        expect(state.ids).toEqual(['2']);
        expect(state.page).toBe(2);
        expect(state.total).toBe(1);
        expect(state.isLoading).toBe(false);
    });

    test('fetchMollieClientsList.fulfilled appends clients when replace is not set', () => {
        const state = mollieClientsPageSliceReducer(
            { ...initialState, ids: ['1'], entities: { 1: { id: '1' } } } as never,
            fetchMollieClientsList.fulfilled({
                items: [{ id: '2' }], total: 2, page: 1, limit: 15, totalPages: 1,
            } as never, 'id', {}),
        );

        expect(state.ids).toEqual(['1', '2']);
    });

    test('fetchMollieClientsList.rejected stores the error', () => {
        const state = mollieClientsPageSliceReducer(
            initialState,
            fetchMollieClientsList.rejected(new Error('fail'), 'id', {}, 'error'),
        );

        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('error');
    });

    test('fetchAllMandates.fulfilled stores the mandates', () => {
        const mandates = [{ id: '1' }];
        const state = mollieClientsPageSliceReducer(
            initialState,
            fetchAllMandates.fulfilled(mandates as never, 'id', { customerId: 'cst_1' }),
        );

        expect(state.mandates).toEqual(mandates);
        expect(state.isLoading).toBe(false);
    });

    test('fetchAllSubscriptions.fulfilled stores the subscriptions', () => {
        const subscriptions = [{ id: '1' }];
        const state = mollieClientsPageSliceReducer(
            initialState,
            fetchAllSubscriptions.fulfilled(subscriptions as never, 'id', { customerId: 'cst_1' }),
        );

        expect(state.subscriptions).toEqual(subscriptions);
        expect(state.isLoading).toBe(false);
    });
});
