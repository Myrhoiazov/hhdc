import { StateSchema } from '@/app/providers/StoreProvider';
import {
    getAddClientForm,
    getAddClientFormError,
    getAddClientFormIsLoading,
} from './getAddClientForm';

describe('addMollieClientForm selectors', () => {
    test('getAddClientForm returns the data', () => {
        const data = { id: '1', name: 'Client B.V.' };
        const state: DeepPartial<StateSchema> = { addMollieClientForm: { data } };

        expect(getAddClientForm(state as StateSchema)).toEqual(data);
    });

    test('getAddClientForm returns undefined when the slice is missing', () => {
        expect(getAddClientForm({} as StateSchema)).toBeUndefined();
    });

    test('getAddClientFormError returns the error', () => {
        const state: DeepPartial<StateSchema> = { addMollieClientForm: { error: 'boom' } };

        expect(getAddClientFormError(state as StateSchema)).toBe('boom');
    });

    test('getAddClientFormIsLoading returns the loading flag', () => {
        const state: DeepPartial<StateSchema> = { addMollieClientForm: { isLoading: true } };

        expect(getAddClientFormIsLoading(state as StateSchema)).toBe(true);
    });
});
