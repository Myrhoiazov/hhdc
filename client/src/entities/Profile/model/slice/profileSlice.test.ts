import { fetchProfileData } from '../services/fetchProfileData/fetchProfileData';
import { updateProfileData } from '../services/updateProfileData/updateProfileData';
import { profileActions, profileReducer } from './profileSlice';
import { IProfile, ProfileSchema, ValidateProfileError } from '../types/profile';

describe('profileSlice', () => {
    test('returns the initial state', () => {
        const state = profileReducer(undefined, { type: '@@INIT' });

        expect(state).toEqual({
            readonly: true,
            isLoading: false,
            error: undefined,
            data: undefined,
        });
    });

    test('setReadonly sets the readonly flag', () => {
        const state = profileReducer({ readonly: true, isLoading: false } as ProfileSchema, profileActions.setReadonly(false));
        expect(state.readonly).toBe(false);
    });

    test('cancelEdit resets the form to the last saved data and clears validation errors', () => {
        const data: IProfile = { id: '1', firstName: 'Ivan' };
        const initialState: ProfileSchema = {
            readonly: false,
            isLoading: false,
            data,
            form: { id: '1', firstName: 'Changed' },
            validateErrors: [ValidateProfileError.INCORRECT_USER_DATA],
        };

        const state = profileReducer(initialState, profileActions.cancelEdit());

        expect(state.readonly).toBe(true);
        expect(state.form).toEqual(data);
        expect(state.validateErrors).toBeUndefined();
    });

    test('updateProfile merges the payload into the form', () => {
        const initialState: ProfileSchema = {
            readonly: false,
            isLoading: false,
            form: { id: '1', firstName: 'Ivan' },
        };

        const state = profileReducer(initialState, profileActions.updateProfile({ lastName: 'Petrov' }));

        expect(state.form).toEqual({ id: '1', firstName: 'Ivan', lastName: 'Petrov' });
    });

    test('sets isLoading and clears error on fetchProfileData.pending', () => {
        const initialState: ProfileSchema = { readonly: true, isLoading: false, error: { status: 500 } };
        const state = profileReducer(initialState, fetchProfileData.pending('requestId', '1'));

        expect(state.isLoading).toBe(true);
        expect(state.error).toBeUndefined();
    });

    test('stores the profile on fetchProfileData.fulfilled', () => {
        const profile: IProfile = { id: '1', firstName: 'Ivan' };
        const initialState: ProfileSchema = { readonly: true, isLoading: true };

        const state = profileReducer(initialState, fetchProfileData.fulfilled(profile, 'requestId', '1'));

        expect(state.isLoading).toBe(false);
        expect(state.data).toEqual(profile);
        expect(state.form).toEqual(profile);
    });

    test('stores the error on fetchProfileData.rejected', () => {
        const error = { status: 500, message: 'boom' };
        const initialState: ProfileSchema = { readonly: true, isLoading: true };

        const state = profileReducer(initialState, fetchProfileData.rejected(new Error('fail'), 'requestId', '1', error));

        expect(state.isLoading).toBe(false);
        expect(state.error).toEqual(error);
    });

    test('sets isLoading and clears validation errors on updateProfileData.pending', () => {
        const initialState: ProfileSchema = {
            readonly: false,
            isLoading: false,
            validateErrors: [ValidateProfileError.INCORRECT_USER_DATA],
        };

        const state = profileReducer(initialState, updateProfileData.pending('requestId'));

        expect(state.isLoading).toBe(true);
        expect(state.validateErrors).toBeUndefined();
    });

    test('stores the profile and switches to readonly on updateProfileData.fulfilled', () => {
        const profile: IProfile = { id: '1', firstName: 'Ivan' };
        const initialState: ProfileSchema = { readonly: false, isLoading: true };

        const state = profileReducer(initialState, updateProfileData.fulfilled(profile, 'requestId'));

        expect(state.isLoading).toBe(false);
        expect(state.data).toEqual(profile);
        expect(state.form).toEqual(profile);
        expect(state.readonly).toBe(true);
    });

    test('stores validation errors on updateProfileData.rejected', () => {
        const errors = [ValidateProfileError.SERVER_ERROR];
        const initialState: ProfileSchema = { readonly: false, isLoading: true };

        const state = profileReducer(initialState, updateProfileData.rejected(new Error('fail'), 'requestId', undefined, errors));

        expect(state.isLoading).toBe(false);
        expect(state.validateErrors).toEqual(errors);
    });
});
