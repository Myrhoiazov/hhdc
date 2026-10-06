import { StateSchema } from '@/app/providers/StoreProvider';
import { ValidateClientError } from '../../consts/consts';
import { getAddClientFormValidateErrors } from './getAddClientFormValidateErrors';

describe('getAddClientFormValidateErrors', () => {
    test('returns the validation errors', () => {
        const validateErrors = [ValidateClientError.NO_DATA];
        const state: DeepPartial<StateSchema> = { client: { validateErrors } };

        expect(getAddClientFormValidateErrors(state as StateSchema)).toEqual(validateErrors);
    });

    test('returns undefined when the slice is missing', () => {
        expect(getAddClientFormValidateErrors({} as StateSchema)).toBeUndefined();
    });
});
