import { useCallback } from 'react';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { RoleKey } from '@/entities/Role';
import { newUserActions } from '../../model/slices/newUserSlice';

export const useUserFormUpdaters = () => {
    const dispatch = useAppDispatch();

    const onChangeFirsttName = useCallback((value?: string) => {
        dispatch(newUserActions.updateUserForm({ firstName: value ?? '' }));
    }, [dispatch]);

    const onChangeLastName = useCallback((value?: string) => {
        dispatch(newUserActions.updateUserForm({ lastName: value || '' }));
    }, [dispatch]);

    const onChangeEmail = useCallback((value?: string) => {
        dispatch(newUserActions.updateUserForm({ email: value || '' }));
    }, [dispatch]);

    const onChangePassword = useCallback((value?: string) => {
        dispatch(newUserActions.updateUserForm({ password: value || '' }));
    }, [dispatch]);

    const onChangeUserRole = useCallback((role: RoleKey) => {
        dispatch(newUserActions.updateUserForm({ role }));
    }, [dispatch]);

    const cleanForm = useCallback(() => {
        onChangeFirsttName('');
        onChangeLastName('');
        onChangeEmail('');
    }, [onChangeFirsttName, onChangeLastName, onChangeEmail]);

    return {
        onChangeFirsttName, onChangeLastName, onChangeEmail,
        onChangePassword, onChangeUserRole, cleanForm,
    };
};
