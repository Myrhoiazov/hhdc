import { StateSchema } from '@/app/providers/StoreProvider';
import { getLoginIsLoading } from './getLoginIsLoading';

describe('getLoginIsLoading', () => {
    test('returns the loading flag', () => {
        const state: DeepPartial<StateSchema> = { loginForm: { isLoading: true } };
        expect(getLoginIsLoading(state as StateSchema)).toBe(true);
    });

    test('defaults to false when the slice is missing', () => {
        expect(getLoginIsLoading({} as StateSchema)).toBe(false);
    });
});
