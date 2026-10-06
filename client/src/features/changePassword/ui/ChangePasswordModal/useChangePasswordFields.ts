import { useState } from 'react';
import { ChangePasswordError } from '../../model/types/changePassword';

export const useChangePasswordFields = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<ChangePasswordError[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    return {
        currentPassword, setCurrentPassword,
        newPassword, setNewPassword,
        confirmPassword, setConfirmPassword,
        errors, setErrors,
        isLoading, setIsLoading,
        isSuccess, setIsSuccess,
    };
};
