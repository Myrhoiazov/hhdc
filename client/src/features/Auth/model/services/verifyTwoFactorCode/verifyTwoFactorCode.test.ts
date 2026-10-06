import { AxiosError } from 'axios';
import { userActions } from '@/entities/User';
import { verifyTwoFactorCode } from './verifyTwoFactorCode';

const dispatch = jest.fn();
const extra = { api: { post: jest.fn() } };

beforeEach(() => {
    dispatch.mockClear();
    extra.api.post.mockClear();
});

function axiosError(status: number, message?: string): AxiosError {
    const error = new Error(message) as AxiosError;
    error.isAxiosError = true;
    error.response = { status, data: message ? { message } : undefined } as never;
    return error;
}

describe('verifyTwoFactorCode', () => {
    test('verifies the code, dispatches setAuthData, and fulfills with the user', async () => {
        const user = { id: '1', username: 'denis', email: 'a@b.com', role: 'admin' };
        extra.api.post.mockResolvedValue({ data: user });

        const result = await verifyTwoFactorCode({ code: '123456' })(dispatch, () => ({}) as never, extra as never);

        expect(extra.api.post).toHaveBeenCalledWith('/auth/login/2fa/verify', { code: '123456' });
        expect(dispatch).toHaveBeenCalledWith(userActions.setAuthData(user as never));
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(user);
    });

    test('rejects with the server error on an invalid code', async () => {
        extra.api.post.mockRejectedValue(axiosError(400, 'Invalid code'));

        const result = await verifyTwoFactorCode({ code: '000000' })(dispatch, () => ({}) as never, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toEqual({ status: 400, message: 'Invalid code' });
    });

    test('rejects with a generic message for a non-axios error', async () => {
        extra.api.post.mockRejectedValue(new Error('boom'));

        const result = await verifyTwoFactorCode({ code: '000000' })(dispatch, () => ({}) as never, extra as never);

        expect(result.payload).toEqual({ status: 500, message: 'Unknown error' });
    });
});
