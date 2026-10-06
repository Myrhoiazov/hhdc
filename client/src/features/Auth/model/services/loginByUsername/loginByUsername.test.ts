import { AxiosError } from 'axios';
import { userActions } from '@/entities/User';
import { loginByUsername } from './loginByUsername';

const dispatch = jest.fn();
const extra = { api: { post: jest.fn() } };

beforeEach(() => {
    dispatch.mockClear();
    extra.api.post.mockClear();
});

function axiosError(status: number, message?: string, code?: string): AxiosError {
    const error = new Error(message) as AxiosError;
    error.isAxiosError = true;
    error.code = code;
    error.response = { status, data: message ? { message } : undefined } as never;
    return error;
}

function axiosErrorWithData(status: number, data: Record<string, unknown>): AxiosError {
    const error = new Error('captcha') as AxiosError;
    error.isAxiosError = true;
    error.response = { status, data } as never;
    return error;
}

describe('loginByUsername', () => {
    const credentials = { email: 'a@b.com', password: 'secret' };

    test('logs in and dispatches setAuthData when 2FA is not required', async () => {
        const user = { id: '1', username: 'denis', email: 'a@b.com', role: 'admin' };
        extra.api.post.mockResolvedValue({ data: user });

        const result = await loginByUsername(credentials)(dispatch, () => ({}) as never, extra as never);

        expect(extra.api.post).toHaveBeenCalledWith('/auth/login', credentials);
        expect(dispatch).toHaveBeenCalledWith(userActions.setAuthData(user as never));
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(user);
    });

    test('does not dispatch setAuthData when a 2FA challenge is required', async () => {
        const challenge = { requiresTwoFactor: true, maskedEmail: 'a***@b.com' };
        extra.api.post.mockResolvedValue({ data: challenge });

        const result = await loginByUsername(credentials)(dispatch, () => ({}) as never, extra as never);

        expect(dispatch).not.toHaveBeenCalledWith(userActions.setAuthData(expect.anything()));
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(challenge);
    });

    test('rejects with the server error message on a 401 response', async () => {
        extra.api.post.mockRejectedValue(axiosError(401, 'Invalid credentials'));

        const result = await loginByUsername(credentials)(dispatch, () => ({}) as never, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toEqual({ status: 401, message: 'Invalid credentials' });
    });

    test('rejects with a network-specific message on ERR_NETWORK', async () => {
        extra.api.post.mockRejectedValue(axiosError(500, undefined, 'ERR_NETWORK'));

        const result = await loginByUsername(credentials)(dispatch, () => ({}) as never, extra as never);

        expect(result.payload).toEqual({
            status: 500,
            message: 'Локальный сервер недоступен. Запустите backend на порту 8080.',
        });
    });

    test('rejects with a generic message for a non-axios error', async () => {
        extra.api.post.mockRejectedValue(new Error('boom'));

        const result = await loginByUsername(credentials)(dispatch, () => ({}) as never, extra as never);

        expect(result.payload).toEqual({ status: 500, message: 'Unknown error' });
    });

    test('forwards captchaToken in the request body when provided', async () => {
        extra.api.post.mockResolvedValue({ data: { requiresTwoFactor: true, maskedEmail: 'a***@b.com' } });

        await loginByUsername({ ...credentials, captchaToken: 'token-abc' })(dispatch, () => ({}) as never, extra as never);

        expect(extra.api.post).toHaveBeenCalledWith('/auth/login', { ...credentials, captchaToken: 'token-abc' });
    });

    test('rejects with code and siteKey when the server requires a captcha', async () => {
        extra.api.post.mockRejectedValue(axiosErrorWithData(400, {
            code: 'CAPTCHA_REQUIRED',
            message: 'Подтвердите, что вы не робот, и попробуйте снова.',
            siteKey: 'site-key-xyz',
        }));

        const result = await loginByUsername(credentials)(dispatch, () => ({}) as never, extra as never);

        expect(result.payload).toEqual({
            status: 400,
            message: 'Подтвердите, что вы не робот, и попробуйте снова.',
            code: 'CAPTCHA_REQUIRED',
            siteKey: 'site-key-xyz',
        });
    });
});
