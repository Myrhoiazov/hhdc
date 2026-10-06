import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Modal } from '@/shared/ui/Modal/Modal';
import { Text } from '@/shared/ui/Text/Text';
import { VStack } from '@/shared/ui/Stack';
import { ChangePasswordError } from '../../model/types/changePassword';
import { ChangePasswordFields } from './ChangePasswordFields';
import { ChangePasswordActions } from './ChangePasswordActions';
import { useChangePasswordSubmit } from './useChangePasswordSubmit';
import cls from './ChangePasswordModal.module.scss';

interface ChangePasswordModalProps {
    className?: string;
    isOpen: boolean;
    onClose: () => void;
    profileId: string;
}

const getErrorText = (err: ChangePasswordError, t: (key: string) => string): string => {
    if (err === ChangePasswordError.PASSWORDS_DONT_MATCH) return t('Пароли не совпадают');
    if (err === ChangePasswordError.CURRENT_PASSWORD_INCORRECT) return t('Текущий пароль неверный');
    if (err === ChangePasswordError.SERVER_ERROR) return t('Ошибка сервера, попробуйте позже');
    if (err === ChangePasswordError.REQUIRED_FIELDS) return t('Заполните все поля');
    return '';
};

const ErrorsList = ({ errors }: { errors: ChangePasswordError[] }) => {
    const { t } = useTranslation('profile');
    if (!errors.length) {
        return null;
    }
    return (
        <>
            {errors.map((err) => (
                <Text key={err} text={getErrorText(err, t)} variant="error" />
            ))}
        </>
    );
};

export const ChangePasswordModal = memo((props: ChangePasswordModalProps) => {
    const { className, isOpen, onClose, profileId } = props;
    const { t } = useTranslation('profile');

    const {
        currentPassword, setCurrentPassword,
        newPassword, setNewPassword,
        confirmPassword, setConfirmPassword,
        errors, isLoading, isSuccess,
        onSubmit, handleClose,
    } = useChangePasswordSubmit({ profileId, onClose });

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            lazy
            className={classNames('', {}, [className])}
        >
            <VStack gap="24" className={cls.content}>
                <Text title={t('Изменить пароль')} className={cls.title} />

                <ErrorsList errors={errors} />

                {isSuccess && <Text text={t('Пароль успешно изменён')} variant="accent" />}

                <ChangePasswordFields
                    currentPassword={currentPassword}
                    newPassword={newPassword}
                    confirmPassword={confirmPassword}
                    onChangeCurrent={setCurrentPassword}
                    onChangeNew={setNewPassword}
                    onChangeConfirm={setConfirmPassword}
                />

                <ChangePasswordActions isLoading={isLoading} onClose={handleClose} onSubmit={() => onSubmit()} />
            </VStack>
        </Modal>
    );
});
