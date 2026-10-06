import { initAuthData } from '../services/initAuthData';
import { userActions, userReducer } from './userSlice';
import { User, UserSchema } from '../types/user';

const user: User = {
    id: '1',
    username: 'denis',
    email: 'denis@example.com',
    role: 'admin' as User['role'],
};

describe('userSlice', () => {
    test('returns the initial state', () => {
        const state = userReducer(undefined, { type: '@@INIT' });

        expect(state).toEqual({ _inited: false });
    });

    test('setAuthData stores the user', () => {
        const initialState: UserSchema = { _inited: true };
        const state = userReducer(initialState, userActions.setAuthData(user));

        expect(state.authData).toEqual(user);
    });

    test('logout clears the user', () => {
        const initialState: UserSchema = { _inited: true, authData: user };
        const state = userReducer(initialState, userActions.logout());

        expect(state.authData).toBeUndefined();
    });

    test('stores the user and marks inited on initAuthData.fulfilled', () => {
        const initialState: UserSchema = { _inited: false };
        const state = userReducer(
            initialState,
            initAuthData.fulfilled(user, 'requestId'),
        );

        expect(state.authData).toEqual(user);
        expect(state._inited).toBe(true);
    });

    test('clears the user and marks inited on initAuthData.rejected', () => {
        const initialState: UserSchema = { _inited: false, authData: user };
        const state = userReducer(
            initialState,
            initAuthData.rejected(new Error('fail'), 'requestId', undefined, 'error'),
        );

        expect(state.authData).toBeUndefined();
        expect(state._inited).toBe(true);
    });
});
