import { logout } from './logout';
import { userActions } from '../slice/userSlice';
import { csrfActions } from '@/shared/api/api';

jest.mock('@/shared/api/api', () => ({
    csrfActions: { reset: jest.fn() },
}));

const dispatch = jest.fn();
const extra = { apiPrivate: { post: jest.fn() } };

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.post.mockClear();
    (csrfActions.reset as jest.Mock).mockClear();
});

describe('logout', () => {
    test('posts to /auth/logout, resets the CSRF token, and dispatches logout', async () => {
        extra.apiPrivate.post.mockResolvedValue({});

        const result = await logout()(dispatch, () => ({}) as never, extra as never);

        expect(extra.apiPrivate.post).toHaveBeenCalledWith('/auth/logout');
        expect(csrfActions.reset).toHaveBeenCalled();
        expect(dispatch).toHaveBeenCalledWith(userActions.logout());
        expect(result.meta.requestStatus).toBe('fulfilled');
    });

    test('still resets the CSRF token and logs out locally when the request fails', async () => {
        extra.apiPrivate.post.mockRejectedValue(new Error('network error'));

        const result = await logout()(dispatch, () => ({}) as never, extra as never);

        expect(csrfActions.reset).toHaveBeenCalled();
        expect(dispatch).toHaveBeenCalledWith(userActions.logout());
        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('REFRESH_FAILED');
    });
});
