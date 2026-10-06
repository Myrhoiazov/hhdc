import { fromPartial } from '@total-typescript/shoehorn';
import { StateSchema } from '@/app/providers/StoreProvider';
import { ValidateProfileError } from '@/entities/Profile';
import { RoleKey } from '@/entities/Role';
import { updateProfileData } from './updateProfileData';

const dispatch = jest.fn();
const extra = { apiPrivate: { put: jest.fn(), patch: jest.fn() } };

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.put.mockClear();
    extra.apiPrivate.patch.mockClear();
});

function stateWith(form: Record<string, unknown>, authData: Record<string, unknown>): () => StateSchema {
    return () => fromPartial({
        profile: { form, isLoading: false, readonly: false },
        user: { authData, _inited: true },
    });
}

describe('updateProfileData (editProfile)', () => {
    test('rejects with validation errors without calling the API when the form is invalid', async () => {
        const getState = stateWith({ id: '1' }, { id: '1', role: RoleKey.ADMIN });

        const result = await updateProfileData()(dispatch, getState, extra as never);

        expect(extra.apiPrivate.put).not.toHaveBeenCalled();
        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toEqual([ValidateProfileError.INCORRECT_USER_DATA]);
    });

    test('updates the profile and re-initializes auth data on success', async () => {
        const updated = { id: '1', firstName: 'Ivan', lastName: 'Petrov' };
        extra.apiPrivate.put.mockResolvedValue({ data: updated });
        const getState = stateWith(
            { id: '1', firstName: 'Ivan', lastName: 'Petrov' },
            { id: '1', role: RoleKey.MANAGER },
        );

        const result = await updateProfileData()(dispatch, getState, extra as never);

        expect(extra.apiPrivate.put).toHaveBeenCalledWith('/profile/1', {
            firstName: 'Ivan',
            lastName: 'Petrov',
            email: undefined,
        });
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(updated);
    });

    test('rejects with SERVER_ERROR when the API call fails', async () => {
        extra.apiPrivate.put.mockRejectedValue(new Error('network error'));
        const getState = stateWith(
            { id: '1', firstName: 'Ivan', lastName: 'Petrov' },
            { id: '1', role: RoleKey.MANAGER },
        );

        const result = await updateProfileData()(dispatch, getState, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toEqual([ValidateProfileError.SERVER_ERROR]);
    });
});
