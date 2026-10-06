import { addSubscription } from '../services/addSubscription/addSubscription';
import { fetchMollieClientsList } from '../services/fetchMollieClientsList/fetchMollieClientsList';
import { addMollieSubscriptionActions, addMollieSubscriptionReducer } from './addMollieSubscriptionSlice';
import { AddMollieSubscriptionSchema } from '../types/addMollieSubscriptionSchema';
import { MollieSubscription } from '@/entities/MollieSubscription';

describe('addMollieSubscriptionSlice', () => {
    test('returns the initial state', () => {
        const state = addMollieSubscriptionReducer(undefined, { type: '@@INIT' });

        expect(state).toEqual({ data: undefined, customers: undefined, isLoading: false, error: undefined });
    });

    test('update merges the payload into the data', () => {
        const initialState: AddMollieSubscriptionSchema = { data: { customerId: '1' } as MollieSubscription };

        const state = addMollieSubscriptionReducer(
            initialState,
            addMollieSubscriptionActions.update({ amount: { currency: 'EUR', value: '10.00' } } as MollieSubscription),
        );

        expect(state.data).toEqual({ customerId: '1', amount: { currency: 'EUR', value: '10.00' } });
    });

    test('sets isLoading on addSubscription.pending', () => {
        const state = addMollieSubscriptionReducer(
            { isLoading: false, error: 'boom' } as AddMollieSubscriptionSchema,
            addSubscription.pending('requestId'),
        );

        expect(state.isLoading).toBe(true);
        expect(state.error).toBeUndefined();
    });

    test('clears isLoading on addSubscription.fulfilled', () => {
        const state = addMollieSubscriptionReducer(
            { isLoading: true } as AddMollieSubscriptionSchema,
            addSubscription.fulfilled({} as never, 'requestId'),
        );

        expect(state.isLoading).toBe(false);
    });

    test('stores the error on addSubscription.rejected', () => {
        const state = addMollieSubscriptionReducer(
            { isLoading: true } as AddMollieSubscriptionSchema,
            addSubscription.rejected(new Error('fail'), 'requestId', undefined, 'error'),
        );

        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('error');
    });

    test('sets isLoading on fetchMollieClientsList.pending', () => {
        const state = addMollieSubscriptionReducer(
            { isLoading: false, error: 'boom' } as AddMollieSubscriptionSchema,
            fetchMollieClientsList.pending('requestId'),
        );

        expect(state.isLoading).toBe(true);
        expect(state.error).toBeUndefined();
    });

    test('stores the customers list on fetchMollieClientsList.fulfilled', () => {
        const customers = [{ id: '1' }] as never;
        const state = addMollieSubscriptionReducer(
            { isLoading: true } as AddMollieSubscriptionSchema,
            fetchMollieClientsList.fulfilled(customers, 'requestId'),
        );

        expect(state.isLoading).toBe(false);
        expect(state.customers).toEqual(customers);
    });

    test('stores the error on fetchMollieClientsList.rejected', () => {
        const state = addMollieSubscriptionReducer(
            { isLoading: true } as AddMollieSubscriptionSchema,
            fetchMollieClientsList.rejected(new Error('fail'), 'requestId', undefined, 'error'),
        );

        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('error');
    });
});
