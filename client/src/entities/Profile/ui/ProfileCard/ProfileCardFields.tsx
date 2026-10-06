import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/ui/Input/Input';
import { RoleKey, RoleSelect } from '@/entities/Role';
import { IProfile } from '@/entities/Profile/model/types/profile';
import cls from './ProfileCard.module.scss';

interface ProfileCardFieldsProps {
    data?: IProfile;
    readonly?: boolean;
    onChangeFirstname?: (value?: string) => void;
    onChangeLastname?: (value?: string) => void;
    onChangeEmail?: (value?: string) => void;
    onChangeAvatar?: (value?: string) => void;
    onChangeRole?: (currency: RoleKey) => void;
}

export const ProfileCardFields = memo((props: ProfileCardFieldsProps) => {
    const {
        data, readonly, onChangeFirstname, onChangeLastname, onChangeEmail, onChangeAvatar, onChangeRole,
    } = props;
    const { t } = useTranslation('profile');

    return (
        <div className={cls.fieldsGrid}>
            <Input
                value={data?.firstName} placeholder={t('Ваше имя')} label={t('Имя')}
                onChange={onChangeFirstname} readonly={readonly} fullWidth
            />
            <Input
                value={data?.lastName} placeholder={t('Ваша фамилия')} label={t('Фамилия')}
                onChange={onChangeLastname} readonly={readonly} fullWidth
            />
            <Input
                value={data?.email} placeholder={t('Введите email')} label={t('Email')}
                onChange={onChangeEmail} readonly={readonly} fullWidth className={cls.fieldFull}
            />
            <Input
                value={data?.avatar} placeholder={t('Введите ссылку на аватар')} label={t('Ссылка на аватар')}
                onChange={onChangeAvatar} readonly={readonly} fullWidth className={cls.fieldFull}
            />
            <div className={cls.fieldFull}>
                <RoleSelect value={data?.role} onChange={onChangeRole} readonly={readonly} />
            </div>
        </div>
    );
});