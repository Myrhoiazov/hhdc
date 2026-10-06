import { IProfile } from '@/entities/Profile';
import { ValidateClientError } from '../consts/consts';
import { newUserActions, newUserReducer } from './newUserSlice';
import { UserFormSchema } from '../types/addUserFormSchema';

describe('newUserSlice', () => {
    test('returns the initial state', () => {
        const state = newUserReducer(undefined, { type: '@@INIT' });

        expect(state).toEqual({ readonly: true, isLoading: false, error: undefined, data: undefined });
    });

    test('setReadonly sets the readonly flag', () => {
        const state = newUserReducer({ readonly: true, isLoading: false } as UserFormSchema, newUserActions.setReadonly(false));
        expect(state.readonly).toBe(false);
    });

    test('cancelEdit resets readonly and clears validation errors', () => {
        const initialState: UserFormSchema = {
            readonly: false,
            isLoading: false,
            validateErrors: [ValidateClientError.NO_DATA],
        };

        const state = newUserReducer(initialState, newUserActions.cancelEdit());

        expect(state.readonly).toBe(true);
        expect(state.validateErrors).toBeUndefined();
    });

    test('cleanForm resets readonly, validation errors, and data', () => {
        const initialState: UserFormSchema = {
            readonly: false,
            isLoading: false,
            validateErrors: [ValidateClientError.NO_DATA],
            data: { id: '1' } as IProfile,
        };

        const state = newUserReducer(initialState, newUserActions.cleanForm());

        expect(state.readonly).toBe(true);
        expect(state.validateErrors).toBeUndefined();
        expect(state.data).toBeUndefined();
    });

    test('updateUserForm merges the payload into the data', () => {
        const initialState: UserFormSchema = {
            readonly: false,
            isLoading: false,
            data: { id: '1', firstName: 'Ivan' } as IProfile,
        };

        const state = newUserReducer(initialState, newUserActions.updateUserForm({ lastName: 'Petrov' } as IProfile));

        expect(state.data).toEqual({ id: '1', firstName: 'Ivan', lastName: 'Petrov' });
    });
});
