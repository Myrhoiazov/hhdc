import { classNames } from '@/shared/lib/classNames/classNames';
import { useTranslation } from 'react-i18next';
import cls from './UserForm.module.scss';
import { memo, useCallback } from 'react';
import { VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { newUserReducer } from '../../model/slices/newUserSlice';
import { useSelector } from 'react-redux';
import { getAddUserForm } from '../../model/selectors/getAddUserForm/getAddUserForm';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { addNewUser } from '../../model/services/addNewUser/addNewUser';
import { UserCard } from '@/entities/User';
import { toast } from 'react-toastify';
import { useUserFormUpdaters } from './useUserFormUpdaters';

interface AddUserFormProps {
    className?: string;
    onSuccess: () => void;
    reloadPage?: () => void;
}

const initialReducers: ReducersList = {
    newUser: newUserReducer,
};

const UserFormTitle = () => {
    const { t } = useTranslation();
    return <Text size="m" title={t('Добавление нового сотрудника')} bold />;
};

const UserFormSubmit = ({ onSave }: { onSave: () => void }) => {
    const { t } = useTranslation();
    return (
        <Button fullWidth onClick={onSave} theme={ButtonTheme.BACKGROUND_INVERTED}>
            {t('Добавить')}
        </Button>
    );
};

const UserForm = memo((props: AddUserFormProps) => {
    const { className, onSuccess, reloadPage } = props;
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    const formData = useSelector(getAddUserForm);
    const {
        onChangeFirsttName, onChangeLastName, onChangeEmail,
        onChangePassword, onChangeUserRole, cleanForm,
    } = useUserFormUpdaters();

    const onSave = useCallback(async () => {
        const result = await dispatch(addNewUser());
        if (result.meta.requestStatus === 'fulfilled') {
            onSuccess();
            reloadPage?.();
            cleanForm();
            toast.success(t('Пользователь успешно добавлен'));
        }
    }, [onSuccess, cleanForm, dispatch, reloadPage, t]);

    return (
        <DynamicModuleLoader reducers={initialReducers}>
            <div className={classNames(cls.UserForm, {}, [className])}>
                <VStack gap="24" align="center" className={cls.header}>
                    <UserFormTitle />
                    <UserCard
                        onChangeLastName={onChangeLastName}
                        onChangeFirsttName={onChangeFirsttName}
                        onChangeUserRole={onChangeUserRole}
                        onChangePassword={onChangePassword}
                        onChangeEmail={onChangeEmail}
                        data={formData}
                    />
                    <UserFormSubmit onSave={onSave} />
                </VStack>
            </div>
        </DynamicModuleLoader>
    );
});

export default UserForm;
