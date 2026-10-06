import { StateSchema } from '@/app/providers/StoreProvider';
import { getAddClientForm } from './getAddClientForm';

describe('getAddClientForm', () => {
    test('returns the form data', () => {
        const form = { firstName: 'Ivan' };
        const state: DeepPartial<StateSchema> = { client: { form } };

        expect(getAddClientForm(state as StateSchema)).toEqual(form);
    });

    test('returns undefined when the slice is missing', () => {
        expect(getAddClientForm({} as StateSchema)).toBeUndefined();
    });
});
