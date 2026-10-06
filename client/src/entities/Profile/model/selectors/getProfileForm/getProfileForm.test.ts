import { StateSchema } from '@/app/providers/StoreProvider';
import { getProfileForm } from './getProfileForm';

describe('getProfileForm', () => {
    test('returns the profile form', () => {
        const form = { id: '1', firstName: 'Denis' };
        const state: DeepPartial<StateSchema> = { profile: { form } };

        expect(getProfileForm(state as StateSchema)).toEqual(form);
    });

    test('returns undefined when the slice is missing', () => {
        expect(getProfileForm({} as StateSchema)).toBeUndefined();
    });
});
