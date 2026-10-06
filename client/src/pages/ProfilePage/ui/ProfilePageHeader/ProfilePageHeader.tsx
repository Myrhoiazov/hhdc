import { useSelector } from 'react-redux';
import { getProfileData, profileActions } from '@/entities/Profile';
import { useCallback, useState } from 'react';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { classNames } from '@/shared/lib/classNames/classNames';
import { getProfileReadonly } from '@/entities/Profile';
import { updateProfileData } from '@/features/editProfile';
import cls from './ProfilePageHeader.module.scss';
import { getUserAuthData } from '@/entities/User';
import { RoleKey } from '@/entities/Role/';
import { ChangePasswordModal } from '@/features/changePassword';
import { ProfileHeaderInfo } from './ProfileHeaderInfo';
import { ProfileHeaderActions } from './ProfileHeaderActions';

interface ProfilePageHeaderProps {
    className?: string;
}

export const ProfilePageHeader = (props: ProfilePageHeaderProps) => {
    const { className } = props;
    const authData = useSelector(getUserAuthData);
    const profileData = useSelector(getProfileData);

    const isCanEdit = Boolean(authData?.id == profileData?.id || authData?.role === RoleKey.ADMIN);
    const isOwnProfile = Boolean(authData?.id == profileData?.id);

    const readonly = Boolean(useSelector(getProfileReadonly));
    const dispatch = useAppDispatch();

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    const onEdit = useCallback(() => dispatch(profileActions.setReadonly(false)), [dispatch]);
    const onCancelEdit = useCallback(() => dispatch(profileActions.cancelEdit()), [dispatch]);
    const onSave = useCallback(() => dispatch(updateProfileData()), [dispatch]);

    const initials =
        profileData?.firstName && profileData?.lastName
            ? `${profileData.firstName[0]}${profileData.lastName[0]}`.toUpperCase()
            : profileData?.firstName
              ? profileData.firstName[0].toUpperCase()
              : '?';

    return (
        <div className={classNames(cls.ProfilePageHeader, {}, [className])}>
            <div className={cls.banner} />
            <div className={cls.body}>
                <ProfileHeaderInfo profileData={profileData} initials={initials} />
                <ProfileHeaderActions
                    isCanEdit={isCanEdit}
                    isOwnProfile={isOwnProfile}
                    readonly={readonly}
                    onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
                    onEdit={onEdit}
                    onCancelEdit={onCancelEdit}
                    onSave={onSave}
                />
            </div>
            {profileData?.id && (
                <ChangePasswordModal
                    isOpen={isPasswordModalOpen}
                    onClose={() => setIsPasswordModalOpen(false)}
                    profileId={String(profileData.id)}
                />
            )}
        </div>
    );
};
