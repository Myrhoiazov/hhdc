import { useCallback } from 'react';
import { ClientLanguage } from '@/entities/Client';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { clientActions } from '../../model/slices/clientSlice';

export const useClientProfileFields = (onBranchChanged: () => void) => {
    const dispatch = useAppDispatch();

    const onChangeFirstName = useCallback((value?: string) => {
        dispatch(clientActions.updateProfile({ firstName: value ?? '' }));
    }, [dispatch]);
    const onChangeLastName = useCallback((value?: string) => {
        dispatch(clientActions.updateProfile({ lastName: value || '' }));
    }, [dispatch]);
    const onChangeBirthday = useCallback((value?: string) => {
        dispatch(clientActions.updateProfile({ birthday: value || '' }));
    }, [dispatch]);
    const onChangePhoneNumber = useCallback((value?: string) => {
        dispatch(clientActions.updateProfile({ phoneNumber: value || '' }));
    }, [dispatch]);
    const onChangeEmail = useCallback((value?: string) => {
        dispatch(clientActions.updateProfile({ email: value || '' }));
    }, [dispatch]);
    const onChangeSocial = useCallback((value?: string) => {
        dispatch(clientActions.updateProfile({ social: value || '' }));
    }, [dispatch]);
    const onChangeBranchId = useCallback((value?: string) => {
        dispatch(clientActions.updateProfile({ branchId: value || null }));
        onBranchChanged();
    }, [dispatch, onBranchChanged]);
    const onChangePreferredLanguage = useCallback((value?: ClientLanguage) => {
        dispatch(clientActions.updateProfile({ preferredLanguage: value || 'RU' }));
    }, [dispatch]);

    return {
        onChangeFirstName, onChangeLastName, onChangeBirthday,
        onChangePhoneNumber, onChangeEmail, onChangeSocial,
        onChangeBranchId, onChangePreferredLanguage,
    };
};
