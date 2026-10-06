import { StateSchema } from '@/app/providers/StoreProvider';
import { getProfileLoading } from './getProfileLoading';

describe('getProfileLoading', () => {
    test('returns the loading flag', () => {
        const state: DeepPartial<StateSchema> = { profile: { isLoading: true } };

        expect(getProfileLoading(state as StateSchema)).toBe(true);
    });

    test('returns undefined when the slice is missing', () => {
        expect(getProfileLoading({} as StateSchema)).toBeUndefined();
    });
});
