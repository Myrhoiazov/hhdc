import { loginByUsername } from '../services/loginByUsername/loginByUsername';
import { loginActions, loginReducer } from './authSlice';
import { LoginSchema } from '../types/loginSchema';

describe('loginSlice', () => {
    test('returns the initial state', () => {
        const state = loginReducer(undefined, { type: '@@INIT' });

        expect(state).toEqual({ isLoading: false, error: undefined, email: '', password: '' });
    });

    test('setUseremail sets the email', () => {
        const state = loginReducer({ isLoading: false, email: '', password: '' } as LoginSchema, loginActions.setUseremail('a@b.com'));
        expect(state.email).toBe('a@b.com');
    });

    test('setPassword sets the password', () => {
        const state = loginReducer({ isLoading: false, email: '', password: '' } as LoginSchema, loginActions.setPassword('secret'));
        expect(state.password).toBe('secret');
    });

    test('cleanError clears the error', () => {
        const initialState: LoginSchema = { isLoading: false, email: '', password: '', error: { status: 401 } };
        const state = loginReducer(initialState, loginActions.cleanError());
        expect(state.error).toBeUndefined();
    });

    test('sets isLoading and clears error on loginByUsername.pending', () => {
        const initialState: LoginSchema = { isLoading: false, email: '', password: '', error: { status: 401 } };
        const state = loginReducer(initialState, loginByUsername.pending('requestId', { email: '', password: '' }));

        expect(state.isLoading).toBe(true);
        expect(state.error).toBeUndefined();
    });

    test('clears isLoading on loginByUsername.fulfilled', () => {
        const user = { id: '1', username: 'denis', email: 'a@b.com', role: 'admin' } as never;
        const initialState: LoginSchema = { isLoading: true, email: '', password: '' };

        const state = loginReducer(initialState, loginByUsername.fulfilled(user, 'requestId', { email: '', password: '' }));

        expect(state.isLoading).toBe(false);
    });

    test('stores the error on loginByUsername.rejected', () => {
        const error = { status: 401, message: 'Invalid credentials' };
        const initialState: LoginSchema = { isLoading: true, email: '', password: '' };

        const state = loginReducer(
            initialState,
            loginByUsername.rejected(new Error('fail'), 'requestId', { email: '', password: '' }, error),
        );

        expect(state.isLoading).toBe(false);
        expect(state.error).toEqual(error);
    });
});
