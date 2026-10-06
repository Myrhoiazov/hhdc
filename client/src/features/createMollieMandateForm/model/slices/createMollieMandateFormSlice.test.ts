import { addMandate } from '../services/addMandate/addMandate';
import { fetchMollieClientsList } from '../services/fetchMollieClientsList/fetchMollieClientsList';
import { createMollieMandateFormActions, createMollieMandateFormReducer } from './createMollieMandateFormSlice';
import { CreateMollieMandateFormSchema } from '../types/createMollieMandateFormSchema';
import { Mandate } from '@/entities/Mandate';

describe('createMollieMandateFormSlice', () => {
    test('returns the initial state', () => {
        const state = createMollieMandateFormReducer(undefined, { type: '@@INIT' });

        expect(state).toEqual({ data: undefined, customers: undefined, isLoading: false, error: undefined });
    });

    test('updateFotm merges the payload into the data', () => {
        const initialState: CreateMollieMandateFormSchema = { isLoading: false, data: { customerId: '1' } as Mandate };

        const state = createMollieMandateFormReducer(
            initialState,
            createMollieMandateFormActions.updateFotm({ method: 'directdebit' } as Mandate),
        );

        expect(state.data).toEqual({ customerId: '1', method: 'directdebit' });
    });

    test('sets isLoading on addMandate.pending', () => {
        const state = createMollieMandateFormReducer(
            { isLoading: false, error: 'boom' } as CreateMollieMandateFormSchema,
            addMandate.pending('requestId'),
        );

        expect(state.isLoading).toBe(true);
        expect(state.error).toBeUndefined();
    });

    test('clears isLoading on addMandate.fulfilled', () => {
        const state = createMollieMandateFormReducer(
            { isLoading: true } as CreateMollieMandateFormSchema,
            addMandate.fulfilled({} as never, 'requestId'),
        );

        expect(state.isLoading).toBe(false);
    });

    test('stores the error on addMandate.rejected', () => {
        const state = createMollieMandateFormReducer(
            { isLoading: true } as CreateMollieMandateFormSchema,
            addMandate.rejected(new Error('fail'), 'requestId', undefined, 'error'),
        );

        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('error');
    });

    test('stores the customers list on fetchMollieClientsList.fulfilled', () => {
        const customers = [{ id: '1' }] as never;
        const state = createMollieMandateFormReducer(
            { isLoading: true } as CreateMollieMandateFormSchema,
            fetchMollieClientsList.fulfilled(customers, 'requestId', {}),
        );

        expect(state.isLoading).toBe(false);
        expect(state.customers).toEqual(customers);
    });

    test('stores the error on fetchMollieClientsList.rejected', () => {
        const state = createMollieMandateFormReducer(
            { isLoading: true } as CreateMollieMandateFormSchema,
            fetchMollieClientsList.rejected(new Error('fail'), 'requestId', {}, 'error'),
        );

        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('error');
    });
});
