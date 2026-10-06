import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { ClientLanguage } from '@/entities/Client';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { mollieClientActions } from '../../model/slices/mollieClientSlice';
import {
    getMollieClienIsLoading,
    getMollieClientForm,
} from '../../model/selectors/getMollieClientForm';
import { updateMollieClientData } from '../../model/services/updateMollieClientData/updateMollieClientData';

interface UseMollieClientFormOptions {
    onSuccess: () => void;
    reloadPage?: () => void;
}

export const useMollieClientForm = ({ onSuccess, reloadPage }: UseMollieClientFormOptions) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const formData = useSelector(getMollieClientForm);
    const isLoading = useSelector(getMollieClienIsLoading);
    const updateProfile = useCallback(
        (profile: Parameters<typeof mollieClientActions.updateProfile>[0]) => dispatch(mollieClientActions.updateProfile(profile)),
        [dispatch],
    );
    const cleanForm = useCallback(() => {
        updateProfile({ givenName: '' });
        updateProfile({ familyName: '' });
        updateProfile({ email: '' });
    }, [updateProfile]);
    const onSave = useCallback(async () => {
        const result = await dispatch(updateMollieClientData());
        if (result.meta.requestStatus === 'fulfilled') {
            onSuccess();
            reloadPage?.();
            cleanForm();
            toast.success(t('Клиент успешно обновлен'));
        }
    }, [cleanForm, dispatch, onSuccess, reloadPage, t]);
    const onChangeConsumerAccount = useCallback((value?: string) => updateProfile({ consumerAccount: value }), [updateProfile]);
    const onChangeConsumerName = useCallback((value?: string) => updateProfile({ consumerName: value }), [updateProfile]);
    const onChangeConsumerBic = useCallback((value?: string) => updateProfile({ consumerBic: value }), [updateProfile]);
    const onChangeFirstName = useCallback((value?: string) => updateProfile({ givenName: value }), [updateProfile]);
    const onChangeLastName = useCallback((value?: string) => updateProfile({ familyName: value }), [updateProfile]);
    const onChangeEmail = useCallback((value?: string) => updateProfile({ email: value }), [updateProfile]);
    const onChangeCity = useCallback((value?: string) => updateProfile({ city: value }), [updateProfile]);
    const onChangePreferredLanguage = useCallback(
        (value?: ClientLanguage) => updateProfile({ preferredLanguage: value }),
        [updateProfile],
    );

    return {
        formData,
        isLoading,
        t,
        onSave,
        onChangeConsumerAccount,
        onChangeConsumerName,
        onChangeConsumerBic,
        onChangeFirstName,
        onChangeLastName,
        onChangeEmail,
        onChangeCity,
        onChangePreferredLanguage,
    };
};
