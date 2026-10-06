import { ChangePasswordError } from '../types/changePassword';
import { changePasswordThunk } from './changePasswordThunk';

const dispatch = jest.fn();
const extra = { apiPrivate: { put: jest.fn() } };

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.put.mockClear();
});

describe('changePasswordThunk', () => {
    const validArgs = {
        profileId: '1',
        currentPassword: 'old',
        newPassword: 'new123',
        confirmPassword: 'new123',
    };

    test('updates the password on success', async () => {
        extra.apiPrivate.put.mockResolvedValue({});

        const result = await changePasswordThunk(validArgs)(dispatch, () => ({}) as never, extra as never);

        expect(extra.apiPrivate.put).toHaveBeenCalledWith('/profile/1/password', {
            currentPassword: 'old',
            newPassword: 'new123',
        });
        expect(result.meta.requestStatus).toBe('fulfilled');
    });

    test('rejects without calling the API when required fields are missing', async () => {
        const result = await changePasswordThunk({ ...validArgs, currentPassword: '' })(
            dispatch,
            () => ({}) as never,
            extra as never,
        );

        expect(extra.apiPrivate.put).not.toHaveBeenCalled();
        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toEqual([ChangePasswordError.REQUIRED_FIELDS]);
    });

    test('rejects without calling the API when the passwords do not match', async () => {
        const result = await changePasswordThunk({ ...validArgs, confirmPassword: 'different' })(
            dispatch,
            () => ({}) as never,
            extra as never,
        );

        expect(extra.apiPrivate.put).not.toHaveBeenCalled();
        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toEqual([ChangePasswordError.PASSWORDS_DONT_MATCH]);
    });

    test('rejects with CURRENT_PASSWORD_INCORRECT on a 400 response', async () => {
        const error = new Error('bad request') as never as { isAxiosError: boolean; response: { status: number } };
        (error as { isAxiosError: boolean }).isAxiosError = true;
        (error as { response: { status: number } }).response = { status: 400 };
        extra.apiPrivate.put.mockRejectedValue(error);

        const result = await changePasswordThunk(validArgs)(dispatch, () => ({}) as never, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toEqual([ChangePasswordError.CURRENT_PASSWORD_INCORRECT]);
    });

    test('rejects with SERVER_ERROR for any other failure', async () => {
        extra.apiPrivate.put.mockRejectedValue(new Error('network error'));

        const result = await changePasswordThunk(validArgs)(dispatch, () => ({}) as never, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toEqual([ChangePasswordError.SERVER_ERROR]);
    });
});
