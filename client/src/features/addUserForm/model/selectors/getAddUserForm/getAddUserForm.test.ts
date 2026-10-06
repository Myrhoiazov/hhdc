import { StateSchema } from '@/app/providers/StoreProvider';
import { getAddUserForm } from './getAddUserForm';

describe('getAddUserForm', () => {
    test('returns the form data', () => {
        const data = { id: '1', firstName: 'Ivan' };
        const state: DeepPartial<StateSchema> = { newUser: { data } };

        expect(getAddUserForm(state as StateSchema)).toEqual(data);
    });

    test('returns undefined when the slice is missing', () => {
        expect(getAddUserForm({} as StateSchema)).toBeUndefined();
    });
});
