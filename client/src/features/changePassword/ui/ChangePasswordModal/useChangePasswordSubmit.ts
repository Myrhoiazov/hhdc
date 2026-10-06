import { useCallback } from 'react';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { changePasswordThunk } from '../../model/services/changePasswordThunk';
import { ChangePasswordError } from '../../model/types/changePassword';
import { useChangePasswordFields } from './useChangePasswordFields';

export const useChangePasswordSubmit = ({ profileId, onClose }: { profileId: string; onClose: () => void }) => {
    const dispatch = useAppDispatch();
    const fields = useChangePasswordFields();
    const {
        currentPassword, newPassword, confirmPassword,
        setCurrentPassword, setNewPassword, setConfirmPassword, setErrors, setIsLoading, setIsSuccess,
    } = fields;

    const resetInputs = useCallback(() => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    }, [setCurrentPassword, setNewPassword, setConfirmPassword]);

    const onSubmit = useCallback(async () => {
        setErrors([]);
        setIsLoading(true);
        const result = await dispatch(
            changePasswordThunk({ profileId, currentPassword, newPassword, confirmPassword })
        );
        setIsLoading(false);

        if (changePasswordThunk.fulfilled.match(result)) {
            setIsSuccess(true);
            setTimeout(() => {
                setIsSuccess(false);
                resetInputs();
                onClose();
            }, 1500);
        } else if (changePasswordThunk.rejected.match(result)) {
            setErrors(result.payload as ChangePasswordError[]);
        }
    }, [dispatch, profileId, currentPassword, newPassword, confirmPassword, onClose, resetInputs, setErrors, setIsLoading, setIsSuccess]);

    const handleClose = useCallback(() => {
        resetInputs();
        setErrors([]);
        setIsSuccess(false);
        onClose();
    }, [resetInputs, setErrors, setIsSuccess, onClose]);

    return { ...fields, onSubmit, handleClose };
};
