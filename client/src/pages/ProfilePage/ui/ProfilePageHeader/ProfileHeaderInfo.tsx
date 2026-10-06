import { Avatar } from '@/shared/ui/Avatar/Avatar';
import { IProfile } from '@/entities/Profile';
import { RoleLabels } from '@/entities/Role/';
import cls from './ProfilePageHeader.module.scss';

interface ProfileHeaderInfoProps {
    profileData?: IProfile;
    initials: string;
}

export const ProfileHeaderInfo = ({ profileData, initials }: ProfileHeaderInfoProps) => {
    const roleLabel = profileData?.role ? RoleLabels[profileData.role] : '';

    return (
        <div className={cls.left}>
            <div className={cls.avatarWrap}>
                {profileData?.avatar ? (
                    <Avatar src={profileData.avatar} size={46} />
                ) : (
                    <div className={cls.avatarInitials}>{initials}</div>
                )}
            </div>

            <div className={cls.info}>
                <div className={cls.name}>
                    {profileData?.firstName} {profileData?.lastName}
                </div>
                {roleLabel && <span className={cls.badge}>{roleLabel}</span>}
            </div>
        </div>
    );
};
