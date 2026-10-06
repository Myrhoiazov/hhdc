import { StateSchema } from '@/app/providers/StoreProvider';
import { getProfileError } from './getProfileError';

describe('getProfileError', () => {
    test('returns the profile error', () => {
        const error = { status: 500, message: 'boom' };
        const state: DeepPartial<StateSchema> = { profile: { error } };

        expect(getProfileError(state as StateSchema)).toEqual(error);
    });

    test('returns undefined when the slice is missing', () => {
        expect(getProfileError({} as StateSchema)).toBeUndefined();
    });
});
