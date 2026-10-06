import { initAuthData } from './initAuthData';
import { userActions } from '../slice/userSlice';

const dispatch = jest.fn();
const extra = { apiPrivate: { get: jest.fn() } };

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.get.mockClear();
});

describe('initAuthData', () => {
    test('fetches the profile, dispatches setAuthData, and fulfills with the user', async () => {
        const user = { id: '1', username: 'denis', email: 'denis@example.com', role: 'admin' };
        extra.apiPrivate.get.mockResolvedValue({ data: user });

        const result = await initAuthData()(dispatch, () => ({}) as never, extra as never);

        expect(extra.apiPrivate.get).toHaveBeenCalledWith('/profile');
        expect(dispatch).toHaveBeenCalledWith(userActions.setAuthData(user as never));
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(user);
    });

    test('rejects without dispatching setAuthData when the response has no data', async () => {
        extra.apiPrivate.get.mockResolvedValue({ data: undefined });

        const result = await initAuthData()(dispatch, () => ({}) as never, extra as never);

        expect(dispatch).not.toHaveBeenCalledWith(userActions.setAuthData(expect.anything()));
        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('');
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.get.mockRejectedValue(new Error('network error'));

        const result = await initAuthData()(dispatch, () => ({}) as never, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('Unknown profile error');
    });
});
