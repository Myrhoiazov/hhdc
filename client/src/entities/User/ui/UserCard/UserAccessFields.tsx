import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/ui/Input/Input';
import { RoleKey, RoleSelect } from '@/entities/Role';
import { IProfile } from '@/entities/Profile';
import cls from './UserCard.module.scss';

interface UserAccessFieldsProps {
    data?: IProfile;
    readonly?: boolean;
    onChangePassword?: (value?: string) => void;
    onChangeAvatar?: (value?: string) => void;
    onChangeUserRole?: (currency: RoleKey) => void;
}

export const UserAccessFields = (props: UserAccessFieldsProps) => {
    const { data, readonly, onChangePassword, onChangeAvatar, onChangeUserRole } = props;
    const { t } = useTranslation('profile');

    return (
        <>
            <Input
                value={data?.password}
                placeholder={t('Введите пароль')}
                label={t('Пароль')}
                className={cls.input}
                onChange={onChangePassword}
                readonly={readonly}
                fullWidth
            />
            <Input
                value={data?.avatar}
                label={t('Ссылка на аватар')}
                placeholder={t('Введите ссылку на аватар')}
                className={cls.input}
                onChange={onChangeAvatar}
                readonly={readonly}
                fullWidth
            />
            <RoleSelect
                className={cls.input}
                value={data?.role}
                onChange={onChangeUserRole}
                readonly={readonly}
            />
        </>
    );
};