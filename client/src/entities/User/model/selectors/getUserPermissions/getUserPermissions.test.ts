import { StateSchema } from '@/shared/lib/store/StateSchema';
import { getUserPermissions } from './getUserPermissions';

const stateOf = (user: DeepPartial<StateSchema['user']>) => ({ user }) as StateSchema;

test('returns the permissions of the signed-in user', () => {
    const authData = { id: '1', name: 'denis', email: 'denis@example.com', roles: ['ADMIN'], permissions: ['finance.read'] };

    expect(getUserPermissions(stateOf({ authData, _inited: true }))).toEqual(['finance.read']);
});

test('returns the same empty list while nobody is signed in', () => {
    const state = stateOf({ _inited: true });

    expect(getUserPermissions(state)).toEqual([]);
    expect(getUserPermissions(state)).toBe(getUserPermissions(state));
});
