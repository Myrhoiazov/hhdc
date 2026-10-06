import { StateSchema } from '@/app/providers/StoreProvider';
import { getAddClientFormIsLoading } from './getAddClientFormIsLoading';

describe('getAddClientFormIsLoading', () => {
    test('returns the loading flag', () => {
        const state: DeepPartial<StateSchema> = { client: { isLoading: true } };

        expect(getAddClientFormIsLoading(state as StateSchema)).toBe(true);
    });

    test('returns undefined when the slice is missing', () => {
        expect(getAddClientFormIsLoading({} as StateSchema)).toBeUndefined();
    });
});
