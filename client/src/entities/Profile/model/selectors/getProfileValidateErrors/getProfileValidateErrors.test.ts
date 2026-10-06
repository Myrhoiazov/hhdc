import { StateSchema } from '@/app/providers/StoreProvider';
import { ValidateProfileError } from '../../types/profile';
import { getProfileValidateErrors } from './getProfileValidateErrors';

describe('getProfileValidateErrors', () => {
    test('returns the validation errors', () => {
        const validateErrors = [ValidateProfileError.INCORRECT_USER_DATA];
        const state: DeepPartial<StateSchema> = { profile: { validateErrors } };

        expect(getProfileValidateErrors(state as StateSchema)).toEqual(validateErrors);
    });

    test('returns undefined when the slice is missing', () => {
        expect(getProfileValidateErrors({} as StateSchema)).toBeUndefined();
    });
});
