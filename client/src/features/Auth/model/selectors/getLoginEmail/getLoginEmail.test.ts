import { StateSchema } from '@/app/providers/StoreProvider';
import { getLoginEmail } from './getLoginEmail';

describe('getLoginEmail', () => {
    test('returns the login email', () => {
        const state: DeepPartial<StateSchema> = { loginForm: { email: 'a@b.com' } };
        expect(getLoginEmail(state as StateSchema)).toBe('a@b.com');
    });

    test('defaults to an empty string when the slice is missing', () => {
        expect(getLoginEmail({} as StateSchema)).toBe('');
    });
});
