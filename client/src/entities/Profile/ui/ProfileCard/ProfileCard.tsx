import cls from './ProfileCard.module.scss';
import { classNames, Mods } from '@/shared/lib/classNames/classNames';
import { useTranslation } from 'react-i18next';
import { RoleKey } from '@/entities/Role';
import { IProfile, ServerError } from '@/entities/Profile/model/types/profile';
import { StateView } from '@/shared/ui/StateView';
import { ProfileCardFields } from './ProfileCardFields';
import { ProfileCardSkeleton } from './ProfileCardSkeleton';

interface ProfileCardProps {
    className?: string;
    data?: IProfile;
    error?: ServerError;
    isLoading?: boolean;
    readonly?: boolean;
    onChangeLastname?: (value?: string) => void;
    onChangeEmail?: (value?: string) => void;
    onChangeFirstname?: (value?: string) => void;
    onChangeAvatar?: (value?: string) => void;
    onChangeRole?: (currency: RoleKey) => void;
}

export const ProfileCard = (props: ProfileCardProps) => {
    const {
        className, data, isLoading, error, readonly,
        onChangeFirstname, onChangeEmail, onChangeLastname, onChangeAvatar, onChangeRole,
    } = props;
    const { t } = useTranslation('profile');

    if (isLoading) return <ProfileCardSkeleton className={className} />;
    if (error) {
        return (
            <StateView
                className={classNames(cls.ProfileCard, {}, [className, cls.error])}
                tone="error"
                title={t('Произошла ошибка при загрузке профиля')}
                text={t('Попробуйте обновить страницу')}
            />
        );
    }

    const mods: Mods = { [cls.editing]: !readonly };

    return (
        <div className={classNames(cls.ProfileCard, mods, [className])}>
            <div className={cls.inner}>
                <div className={cls.sectionHeader}>
                    <span className={cls.sectionTitle}>{t('Личные данные')}</span>
                    <div className={cls.sectionLine} />
                </div>

                <ProfileCardFields
                    data={data}
                    readonly={readonly}
                    onChangeFirstname={onChangeFirstname}
                    onChangeLastname={onChangeLastname}
                    onChangeEmail={onChangeEmail}
                    onChangeAvatar={onChangeAvatar}
                    onChangeRole={onChangeRole}
                />
            </div>
        </div>
    );
};