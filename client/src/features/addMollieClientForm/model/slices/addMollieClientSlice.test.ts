import { MollieClient } from '@/entities/MollieClient';
import { addMollieClientActions, addMollieClientReducer } from './addMollieClientSlice';
import { AddMollieClientSchema } from '../types/addClientFormSchema';

describe('addMollieClientSlice', () => {
    test('returns the initial state', () => {
        const state = addMollieClientReducer(undefined, { type: '@@INIT' });

        expect(state).toEqual({ isLoading: false, error: undefined, data: undefined });
    });

    test('updateProfile merges the payload into the data', () => {
        const initialState: AddMollieClientSchema = { isLoading: false, data: { id: '1', name: 'Old' } as MollieClient };

        const state = addMollieClientReducer(
            initialState,
            addMollieClientActions.updateProfile({ name: 'New' } as MollieClient),
        );

        expect(state.data).toEqual({ id: '1', name: 'New' });
    });
});
