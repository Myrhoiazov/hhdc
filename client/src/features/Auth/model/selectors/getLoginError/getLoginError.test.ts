import { StateSchema } from '@/app/providers/StoreProvider';
import { getLoginError } from './getLoginError';

describe('getLoginError', () => {
    test('returns the login error', () => {
        const error = { status: 401, message: 'Invalid credentials' };
        const state: DeepPartial<StateSchema> = { loginForm: { error } };
        expect(getLoginError(state as StateSchema)).toEqual(error);
    });

    test('returns undefined when the slice is missing', () => {
        expect(getLoginError({} as StateSchema)).toBeUndefined();
    });
});
