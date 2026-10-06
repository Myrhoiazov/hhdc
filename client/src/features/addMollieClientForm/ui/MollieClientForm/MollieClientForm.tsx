import { classNames } from '@/shared/lib/classNames/classNames';
import { useTranslation } from 'react-i18next';
import cls from './MollieClientForm.module.scss';
import { memo, useCallback } from 'react';
import { VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { addMollieClientReducer } from '../../model/slices/addMollieClientSlice';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { addMolieClientData } from '../../model/services/addMolieClientData/addMolieClientData';
import { toast } from 'react-toastify';
import { MollieClientCard } from '@/entities/MollieClient';
import { getAddClientForm } from '../../model/selectors/getAddClientForm/getAddClientForm';
import { useMollieClientProfileUpdaters } from './useMollieClientProfileUpdaters';

interface MollieClientFormProps {
    className?: string;
    onSuccess: () => void;
    reloadPage?: () => void;
}

const initialReducers: ReducersList = {
    addMollieClientForm: addMollieClientReducer,
};

const MollieClientFormTitle = () => {
    const { t } = useTranslation();
    return <Text size="m" title={t('Добавление нового клиента')} bold />;
};

const MollieClientFormSubmit = ({ onSave }: { onSave: () => void }) => {
    const { t } = useTranslation();
    return (
        <Button fullWidth onClick={onSave} theme={ButtonTheme.BACKGROUND_INVERTED}>
            {t('Добавить')}
        </Button>
    );
};

const MollieClientForm = memo((props: MollieClientFormProps) => {
    const { className, onSuccess, reloadPage } = props;
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const formData = useSelector(getAddClientForm);
    const profileUpdaters = useMollieClientProfileUpdaters();
    const { email: clearEmail } = profileUpdaters;

    const onSave = useCallback(async () => {
        const result = await dispatch(addMolieClientData());
        if (result.meta.requestStatus === 'fulfilled') {
            onSuccess();
            reloadPage?.();
            clearEmail('');
            toast.success(t('Клиент успешно добавлен'));
        }
    }, [onSuccess, clearEmail, dispatch, reloadPage, t]);

    return (
        <DynamicModuleLoader reducers={initialReducers}>
            <div className={classNames(cls.MollieClientForm, {}, [className])}>
                <VStack gap="24" align="center" className={cls.header}>
                    <MollieClientFormTitle />
                    <MollieClientCard
                        onChangeLastName={profileUpdaters.familyName}
                        onChangeFirstName={profileUpdaters.givenName}
                        onChangeEmail={profileUpdaters.email}
                        onChangeCity={profileUpdaters.city}
                        onChangeConsumerAccount={profileUpdaters.consumerAccount}
                        onChangeConsumerName={profileUpdaters.consumerName}
                        onChangeConsumerBic={profileUpdaters.consumerBic}
                        mode="create"
                        data={formData}
                    />
                    <MollieClientFormSubmit onSave={onSave} />
                </VStack>
            </div>
        </DynamicModuleLoader>
    );
});

export default MollieClientForm;
