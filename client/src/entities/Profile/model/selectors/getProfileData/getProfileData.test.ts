import { StateSchema } from '@/app/providers/StoreProvider';
import { getProfileData } from './getProfileData';

describe('getProfileData', () => {
    test('returns the profile data', () => {
        const data = { id: '1', firstName: 'Denis' };
        const state: DeepPartial<StateSchema> = { profile: { data } };

        expect(getProfileData(state as StateSchema)).toEqual(data);
    });

    test('returns undefined when the slice is missing', () => {
        expect(getProfileData({} as StateSchema)).toBeUndefined();
    });
});
