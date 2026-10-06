import { StateSchema } from '@/app/providers/StoreProvider';
import {
    getClientDetailsData,
    getClientDetailsError,
    getClientDetailsIsLoading,
} from './clientDetails';

describe('MollieClient clientDetails selectors', () => {
    test('returns data', () => {
        const data = { id: '1', name: 'Client B.V.' };
        const state: DeepPartial<StateSchema> = { mollieClientDetails: { data } };

        expect(getClientDetailsData(state as StateSchema)).toEqual(data);
    });

    test('returns undefined data when the slice is missing', () => {
        expect(getClientDetailsData({} as StateSchema)).toBeUndefined();
    });

    test('returns isLoading', () => {
        const state: DeepPartial<StateSchema> = { mollieClientDetails: { isLoading: true } };

        expect(getClientDetailsIsLoading(state as StateSchema)).toBe(true);
    });

    test('defaults isLoading to false when the slice is missing', () => {
        expect(getClientDetailsIsLoading({} as StateSchema)).toBe(false);
    });

    test('returns error', () => {
        const state: DeepPartial<StateSchema> = { mollieClientDetails: { error: 'some error' } };

        expect(getClientDetailsError(state as StateSchema)).toBe('some error');
    });
});
