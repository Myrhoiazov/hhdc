import { StateSchema } from '@/app/providers/StoreProvider';
import { getProfileReadonly } from './getProfileReadonly';

describe('getProfileReadonly', () => {
    test('returns the readonly flag', () => {
        const state: DeepPartial<StateSchema> = { profile: { readonly: false } };

        expect(getProfileReadonly(state as StateSchema)).toBe(false);
    });

    test('returns undefined when the slice is missing', () => {
        expect(getProfileReadonly({} as StateSchema)).toBeUndefined();
    });
});
