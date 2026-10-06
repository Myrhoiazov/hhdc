import { StateSchema } from '@/app/providers/StoreProvider';
import {
    getClientDetailsData,
    getClientDetailsError,
    getClientDetailsIsLoading,
} from './clientDetails';

describe('clientDetails selectors', () => {
    test('returns data', () => {
        const data = { id: '1', firstName: 'Иван' };
        const state: DeepPartial<StateSchema> = { clientDetails: { data } };

        expect(getClientDetailsData(state as StateSchema)).toEqual(data);
    });

    test('returns undefined data when the slice is missing', () => {
        expect(getClientDetailsData({} as StateSchema)).toBeUndefined();
    });

    test('returns isLoading', () => {
        const state: DeepPartial<StateSchema> = { clientDetails: { isLoading: true } };

        expect(getClientDetailsIsLoading(state as StateSchema)).toBe(true);
    });

    test('defaults isLoading to false when the slice is missing', () => {
        expect(getClientDetailsIsLoading({} as StateSchema)).toBe(false);
    });

    test('returns error', () => {
        const state: DeepPartial<StateSchema> = { clientDetails: { error: { status: 500, message: 'boom' } } };

        expect(getClientDetailsError(state as StateSchema)).toEqual({ status: 500, message: 'boom' });
    });

    test('returns undefined error when the slice is missing', () => {
        expect(getClientDetailsError({} as StateSchema)).toBeUndefined();
    });
});
