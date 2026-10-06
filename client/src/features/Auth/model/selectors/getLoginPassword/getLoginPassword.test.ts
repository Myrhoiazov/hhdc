import { StateSchema } from '@/app/providers/StoreProvider';
import { getLoginPassword } from './getLoginPassword';

describe('getLoginPassword', () => {
    test('returns the password', () => {
        const state: DeepPartial<StateSchema> = { loginForm: { password: 'secret' } };
        expect(getLoginPassword(state as StateSchema)).toBe('secret');
    });

    test('defaults to an empty string when the slice is missing', () => {
        expect(getLoginPassword({} as StateSchema)).toBe('');
    });
});
