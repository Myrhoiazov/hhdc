import { AxiosError } from 'axios';
import { resendTwoFactorCode } from './resendTwoFactorCode';

const dispatch = jest.fn();
const extra = { api: { post: jest.fn() } };

beforeEach(() => {
    dispatch.mockClear();
    extra.api.post.mockClear();
});

function axiosError(status: number, message?: string, headers?: Record<string, string>): AxiosError {
    const error = new Error(message) as AxiosError;
    error.isAxiosError = true;
    error.response = { status, data: message ? { message } : undefined, headers } as never;
    return error;
}

describe('resendTwoFactorCode', () => {
    test('posts the resend request and fulfills on success', async () => {
        extra.api.post.mockResolvedValue({});

        const result = await resendTwoFactorCode()(dispatch, () => ({}) as never, extra as never);

        expect(extra.api.post).toHaveBeenCalledWith('/auth/login/2fa/resend');
        expect(result.meta.requestStatus).toBe('fulfilled');
    });

    test('rejects with the server message and retryAfterSeconds from headers', async () => {
        extra.api.post.mockRejectedValue(axiosError(429, 'Too many requests', { 'retry-after': '30' }));

        const result = await resendTwoFactorCode()(dispatch, () => ({}) as never, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toEqual({ status: 429, message: 'Too many requests', retryAfterSeconds: 30 });
    });

    test('rejects with a generic message for a non-axios error', async () => {
        extra.api.post.mockRejectedValue(new Error('boom'));

        const result = await resendTwoFactorCode()(dispatch, () => ({}) as never, extra as never);

        expect(result.payload).toEqual({ status: 500, message: 'Unknown error' });
    });
});
