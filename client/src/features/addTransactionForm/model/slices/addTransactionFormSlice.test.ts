import { Transaction } from '@/entities/Transaction';
import { addTransactionFormActions, addTransactionFormReducer } from './addTransactionFormSlice';
import { AddTransactionFormSchema } from '../types/addTransactionFormSchema';

describe('addTransactionFormSlice', () => {
    test('returns the initial state', () => {
        const state = addTransactionFormReducer(undefined, { type: '@@INIT' });

        expect(state).toEqual({ readonly: true, isLoading: false, error: undefined, data: undefined });
    });

    test('setReadonly sets the readonly flag', () => {
        const state = addTransactionFormReducer(
            { readonly: true, isLoading: false, error: undefined } as AddTransactionFormSchema,
            addTransactionFormActions.setReadonly(false),
        );
        expect(state.readonly).toBe(false);
    });

    test('cancelEdit resets readonly and clears the form data', () => {
        const initialState: AddTransactionFormSchema = {
            readonly: false,
            isLoading: false,
            error: undefined,
            data: { id: '1' } as Transaction,
        };

        const state = addTransactionFormReducer(initialState, addTransactionFormActions.cancelEdit());

        expect(state.readonly).toBe(true);
        expect(state.data).toBeUndefined();
    });

    test('cleanForm resets readonly and clears the form data', () => {
        const initialState: AddTransactionFormSchema = {
            readonly: false,
            isLoading: false,
            error: undefined,
            data: { id: '1' } as Transaction,
        };

        const state = addTransactionFormReducer(initialState, addTransactionFormActions.cleanForm());

        expect(state.readonly).toBe(true);
        expect(state.data).toBeUndefined();
    });

    test('updateForm merges the payload into the data', () => {
        const initialState: AddTransactionFormSchema = {
            readonly: false,
            isLoading: false,
            error: undefined,
            data: { id: '1', amount: 100 } as Transaction,
        };

        const state = addTransactionFormReducer(
            initialState,
            addTransactionFormActions.updateForm({ amount: 200 } as Transaction),
        );

        expect(state.data).toEqual({ id: '1', amount: 200 });
    });
});
