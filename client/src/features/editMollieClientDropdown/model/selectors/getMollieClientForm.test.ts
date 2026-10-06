import { StateSchema } from '@/app/providers/StoreProvider';
import {
    getMollieClienIsLoading,
    getMollieClientData,
    getMollieClientForm,
} from './getMollieClientForm';

describe('editMollieClientDropdown selectors', () => {
    test('getMollieClientForm returns the form', () => {
        const form = { id: '1' };
        const state: DeepPartial<StateSchema> = { mollieClientForm: { form } };

        expect(getMollieClientForm(state as StateSchema)).toEqual(form);
    });

    test('getMollieClientData returns the data', () => {
        const data = { id: '1' };
        const state: DeepPartial<StateSchema> = { mollieClientForm: { data } };

        expect(getMollieClientData(state as StateSchema)).toEqual(data);
    });

    test('getMollieClienIsLoading defaults to false', () => {
        expect(getMollieClienIsLoading({} as StateSchema)).toBe(false);
    });

    test('getMollieClienIsLoading returns the loading flag', () => {
        const state: DeepPartial<StateSchema> = { mollieClientForm: { isLoading: true } };
        expect(getMollieClienIsLoading(state as StateSchema)).toBe(true);
    });
});
