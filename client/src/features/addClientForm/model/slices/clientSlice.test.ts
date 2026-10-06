import { Client } from '@/entities/Client';
import { ValidateClientError } from '../consts/consts';
import { clientActions, clientReducer } from './clientSlice';
import { ClientSchema } from '../types/addClientFormSchema';

describe('clientSlice', () => {
    test('returns the initial state', () => {
        const state = clientReducer(undefined, { type: '@@INIT' });

        expect(state).toEqual({
            readonly: true,
            isLoading: false,
            error: undefined,
            data: undefined,
        });
    });

    test('setReadonly sets the readonly flag', () => {
        const state = clientReducer({ readonly: true, isLoading: false } as ClientSchema, clientActions.setReadonly(false));
        expect(state.readonly).toBe(false);
    });

    test('cancelEdit resets the form to the last saved data and clears validation errors', () => {
        const data = { id: '1', firstName: 'Ivan' } as Client;
        const initialState: ClientSchema = {
            readonly: false,
            isLoading: false,
            data,
            form: { id: '1', firstName: 'Changed' } as Client,
            validateErrors: [ValidateClientError.INCORRECT_USER_DATA],
        };

        const state = clientReducer(initialState, clientActions.cancelEdit());

        expect(state.readonly).toBe(true);
        expect(state.form).toEqual(data);
        expect(state.validateErrors).toBeUndefined();
    });

    test('cleanForm clears the form, data, and validation errors', () => {
        const initialState: ClientSchema = {
            readonly: false,
            isLoading: false,
            data: { id: '1' } as Client,
            form: { id: '1' } as Client,
            validateErrors: [ValidateClientError.NO_DATA],
        };

        const state = clientReducer(initialState, clientActions.cleanForm());

        expect(state.readonly).toBe(true);
        expect(state.form).toBeUndefined();
        expect(state.data).toBeUndefined();
        expect(state.validateErrors).toBeUndefined();
    });

    test('updateProfile merges the payload into the form', () => {
        const initialState: ClientSchema = {
            readonly: false,
            isLoading: false,
            form: { id: '1', firstName: 'Ivan' } as Client,
        };

        const state = clientReducer(initialState, clientActions.updateProfile({ lastName: 'Petrov' } as Client));

        expect(state.form).toEqual({ id: '1', firstName: 'Ivan', lastName: 'Petrov' });
    });
});
