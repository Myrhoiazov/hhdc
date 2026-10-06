import { createAsyncThunk } from '@reduxjs/toolkit';
import { StateSchema, ThunkConfig } from '@/app/providers/StoreProvider';
import { IProfile, ValidateProfileError, getProfileForm, validateProfileData } from '@/entities/Profile';
import { initAuthData, getUserAuthData } from '@/entities/User';
import { RoleKey } from '@/entities/Role';

export const updateProfileData = createAsyncThunk<IProfile, void, ThunkConfig<ValidateProfileError[]>>(
    'profile/updateProfileData',
    async (_, thunkApi) => {
        const { extra, rejectWithValue, getState, dispatch } = thunkApi;

        const formData = getProfileForm(getState() as StateSchema);
        const validateErrors = validateProfileData(formData);

        if (validateErrors.length) {
            return rejectWithValue(validateErrors);
        }

        try {
            const authData = getUserAuthData(getState() as StateSchema);
            const response = await extra.apiPrivate.put<IProfile>(`/profile/${formData?.id}`, {
                firstName: formData?.firstName,
                lastName: formData?.lastName,
                email: formData?.email,
            });
            if (!response.data) {
                throw new Error();
            }

            if (
                authData?.role === RoleKey.ADMIN
                && formData?.id !== authData.id
                && formData?.role
            ) {
                await extra.apiPrivate.patch(`/users/${formData.id}`, { role: formData.role });
            }

            dispatch(initAuthData());

            return response.data;
        } catch (e) {
            console.log(e);
            return rejectWithValue([ValidateProfileError.SERVER_ERROR]);
        }
    }
);
