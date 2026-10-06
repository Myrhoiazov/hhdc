import { StateSchema } from '@/app/providers/StoreProvider';
import { getAddClientFormError } from './getAddClientFormError';

describe('getAddClientFormError', () => {
    test('returns the form error', () => {
        const error = { status: 500, message: 'boom' };
        const state: DeepPartial<StateSchema> = { client: { error } };

        expect(getAddClientFormError(state as StateSchema)).toEqual(error);
    });

    test('returns undefined when the slice is missing', () => {
        expect(getAddClientFormError({} as StateSchema)).toBeUndefined();
    });
});
