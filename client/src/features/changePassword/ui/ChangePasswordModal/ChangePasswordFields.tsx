import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/ui/Input/Input';
import { VStack } from '@/shared/ui/Stack';

interface ChangePasswordFieldsProps {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    onChangeCurrent: (value: string) => void;
    onChangeNew: (value: string) => void;
    onChangeConfirm: (value: string) => void;
}

export const ChangePasswordFields = ({
    currentPassword,
    newPassword,
    confirmPassword,
    onChangeCurrent,
    onChangeNew,
    onChangeConfirm,
}: ChangePasswordFieldsProps) => {
    const { t } = useTranslation('profile');

    return (
        <VStack gap="16" max>
            <Input
                type="password"
                value={currentPassword}
                onChange={onChangeCurrent}
                placeholder={t('Текущий пароль')}
                label={t('Текущий пароль')}
                fullWidth
            />
            <Input
                type="password"
                value={newPassword}
                onChange={onChangeNew}
                placeholder={t('Новый пароль')}
                label={t('Новый пароль')}
                fullWidth
            />
            <Input
                type="password"
                value={confirmPassword}
                onChange={onChangeConfirm}
                placeholder={t('Подтвердите новый пароль')}
                label={t('Подтвердите новый пароль')}
                fullWidth
            />
        </VStack>
    );
};
