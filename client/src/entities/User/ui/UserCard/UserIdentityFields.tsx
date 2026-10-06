import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/ui/Input/Input';
import { IProfile } from '@/entities/Profile';
import cls from './UserCard.module.scss';

interface UserIdentityFieldsProps {
    data?: IProfile;
    readonly?: boolean;
    onChangeLastName?: (value?: string) => void;
    onChangeEmail?: (value?: string) => void;
    onChangeFirsttName?: (value?: string) => void;
}

export const UserIdentityFields = (props: UserIdentityFieldsProps) => {
    const { data, readonly, onChangeFirsttName, onChangeLastName, onChangeEmail } = props;
    const { t } = useTranslation('profile');

    return (
        <>
            <Input
                value={data?.firstName}
                placeholder={t('Ваше Имя')}
                label={t('Имя')}
                className={cls.input}
                onChange={onChangeFirsttName}
                readonly={readonly}
                fullWidth
            />
            <Input
                value={data?.lastName}
                placeholder={t('Ваша фамилия')}
                label={t('Фамилия')}
                className={cls.input}
                onChange={onChangeLastName}
                readonly={readonly}
                fullWidth
            />
            <Input
                value={data?.email}
                placeholder={t('Введите email')}
                label={t('Email')}
                className={cls.input}
                onChange={onChangeEmail}
                readonly={readonly}
                fullWidth
            />
        </>
    );
};