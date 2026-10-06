import { memo } from 'react';
import { useSelector } from 'react-redux';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './ProfilePage.module.scss';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { ProfileCard, profileReducer } from '@/entities/Profile';
import { ProfilePageHeader } from './ProfilePageHeader/ProfilePageHeader';
import { RoleKey } from '@/entities/Role';
import { Page } from '@/widgets/Page/Page';
import { getUserAuthData } from '@/entities/User';
import { ActiveSessions } from './ActiveSessions/ActiveSessions';
import { TelegramConnection } from './TelegramConnection/TelegramConnection';
import { useProfilePage } from './useProfilePage';
import { ProfileValidateErrors } from './ProfileValidateErrors';

const reducers: ReducersList = {
    profile: profileReducer,
};

interface ProfilePageProps {
    className?: string;
}

const ProfilePage = ({ className }: ProfilePageProps) => {
    const {
        formData,
        isLoading,
        error,
        readonly,
        validateErrors,
        isOwnProfile,
        updateField,
    } = useProfilePage();
    const authData = useSelector(getUserAuthData);
    const isAdmin = authData?.role === RoleKey.ADMIN;

    return (
        <DynamicModuleLoader reducers={reducers}>
            <Page className={classNames(cls.ProfilePage, {}, [className])}>
                <ProfilePageHeader />
                <ProfileValidateErrors validateErrors={validateErrors} />
                <ProfileCard
                    data={formData}
                    isLoading={isLoading}
                    error={error}
                    readonly={readonly}
                    onChangeFirstname={(value) => updateField({ firstName: value || '' })}
                    onChangeLastname={(value) => updateField({ lastName: value || '' })}
                    onChangeAvatar={(value) => updateField({ avatar: value || '' })}
                    onChangeRole={(role: RoleKey) => updateField({ role })}
                    onChangeEmail={(value) => updateField({ email: value || '' })}
                />
                {isOwnProfile && <ActiveSessions />}
                {isOwnProfile && isAdmin && <TelegramConnection />}
            </Page>
        </DynamicModuleLoader>
    );
};

export default memo(ProfilePage);
