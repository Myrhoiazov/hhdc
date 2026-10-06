import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { useInitialEffect } from '@/shared/lib/hooks/useInitialEffect/useInitialEffect';
import {
    fetchProfileData,
    getProfileError,
    getProfileForm,
    getProfileLoading,
    getProfileReadonly,
    getProfileValidateErrors,
    profileActions,
} from '@/entities/Profile';
import { getUserAuthData } from '@/entities/User';
import { IProfile } from '@/entities/Profile';

export const useProfilePage = () => {
    const { id } = useParams<{ id: string }>();
    const dispatch = useAppDispatch();
    const formData = useSelector(getProfileForm);
    const isLoading = useSelector(getProfileLoading);
    const error = useSelector(getProfileError);
    const readonly = useSelector(getProfileReadonly);
    const validateErrors = useSelector(getProfileValidateErrors);
    const authData = useSelector(getUserAuthData);
    const isOwnProfile = Boolean(authData?.id && id && String(authData.id) === String(id));

    useInitialEffect(() => {
        if (id) {
            dispatch(fetchProfileData(id));
        }
    });

    const updateField = useCallback(
        (patch: Partial<IProfile>) => {
            dispatch(profileActions.updateProfile(patch as IProfile));
        },
        [dispatch]
    );

    return { formData, isLoading, error, readonly, validateErrors, isOwnProfile, updateField };
};
