import { AxiosError } from 'axios';
import { userActions } from '@/entities/User';
import { csrfActions } from '@/shared/api/api';
import { verifyTwoFactorCode } from './verifyTwoFactorCode';

jest.mock('@/shared/api/api', () => ({ csrfActions: { set: jest.fn() } }));

const dispatch = jest.fn();
const extra = { api: { post: jest.fn() } };

beforeEach(() => {
    dispatch.mockClear();
    extra.api.post.mockClear();
});

function axiosError(status: number, message?: string): AxiosError {
    const error = new Error(message) as AxiosError;
    error.isAxiosError = true;
    error.response = {
        status,
        data: message ? { error: { code: 'TWO_FACTOR_INVALID_CODE', message } } : undefined,
    } as never;
    return error;
}

test('verifies the code, stores the session and fulfills with the user', async () => {
    const user = {
        id: 'd22e4515-1000-4000-a000-000000000001',
        name: 'Team',
        email: 'a@b.com',
        roles: ['OWNER'],
        permissions: [] as string[],
    };
    extra.api.post.mockResolvedValue({ data: { data: { user, csrfToken: 'test-csrf' } } });

    const result = await verifyTwoFactorCode({ code: '123456' })(
        dispatch,
        () => ({}) as never,
        extra as never
    );

    expect(extra.api.post).toHaveBeenCalledWith('/auth/login/2fa/verify', { code: '123456' });
    expect(dispatch).toHaveBeenCalledWith(userActions.setAuthData(user as never));
    expect(csrfActions.set).toHaveBeenCalledWith('test-csrf');
    expect(result.meta.requestStatus).toBe('fulfilled');
    expect(result.payload).toEqual(user);
});

test('rejects with the server error on an invalid code', async () => {
    extra.api.post.mockRejectedValue(axiosError(401, 'Wrong confirmation code'));

    const result = await verifyTwoFactorCode({ code: '000000' })(
        dispatch,
        () => ({}) as never,
        extra as never
    );

    expect(result.meta.requestStatus).toBe('rejected');
    expect(result.payload).toEqual({
        status: 401,
        message: 'Wrong confirmation code',
        code: 'TWO_FACTOR_INVALID_CODE',
        siteKey: undefined,
    });
});

test('rejects with a generic message for a non-axios error', async () => {
    extra.api.post.mockRejectedValue(new Error('boom'));

    const result = await verifyTwoFactorCode({ code: '000000' })(
        dispatch,
        () => ({}) as never,
        extra as never
    );

    expect(result.payload).toEqual({ status: 500, message: 'Unknown error' });
});
