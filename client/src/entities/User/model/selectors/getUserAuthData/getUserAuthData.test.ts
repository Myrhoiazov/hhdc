import { StateSchema } from '@/app/providers/StoreProvider';
import { RoleKey } from '@/entities/Role';
import { getUserAuthData } from './getUserAuthData';

describe('getUserAuthData', () => {
    test('returns the authenticated user data', () => {
        const authData = { id: '1', username: 'denis', email: 'denis@example.com', role: RoleKey.ADMIN };
        const state: DeepPartial<StateSchema> = { user: { authData, _inited: true } };

        expect(getUserAuthData(state as StateSchema)).toEqual(authData);
    });

    test('returns undefined when there is no authenticated user', () => {
        const state: DeepPartial<StateSchema> = { user: { _inited: true } };

        expect(getUserAuthData(state as StateSchema)).toBeUndefined();
    });
});
