import { StateSchema } from '@/app/providers/StoreProvider';
import { getUserAuthData } from './getUserAuthData';

describe('getUserAuthData', () => {
    test('returns the authenticated user data', () => {
        const authData = { id: '1', name: 'denis', email: 'denis@example.com', roles: ['ADMIN'], permissions: [] };
        const state: DeepPartial<StateSchema> = { user: { authData, _inited: true } };

        expect(getUserAuthData(state as StateSchema)).toEqual(authData);
    });

    test('returns undefined when there is no authenticated user', () => {
        const state: DeepPartial<StateSchema> = { user: { _inited: true } };

        expect(getUserAuthData(state as StateSchema)).toBeUndefined();
    });
});
