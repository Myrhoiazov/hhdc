import cls from './UserCard.module.scss';
import { RoleKey } from '@/entities/Role';
import { IProfile, ServerError } from '@/entities/Profile';
import { VStack } from '@/shared/ui/Stack';
import { UserCardSkeleton } from './UserCardSkeleton';
import { UserIdentityFields } from './UserIdentityFields';
import { UserAccessFields } from './UserAccessFields';

interface UserCardProps {
    className?: string;
    data?: IProfile;
    error?: ServerError;
    isLoading?: boolean;
    readonly?: boolean;
    onChangeLastName?: (value?: string) => void;
    onChangeEmail?: (value?: string) => void;
    onChangePassword?: (value?: string) => void;
    onChangeFirsttName?: (value?: string) => void;
    onChangeAvatar?: (value?: string) => void;
    onChangeUserRole?: (currency: RoleKey) => void;
}

export const UserCard = (props: UserCardProps) => {
    const {
        className,
        data,
        isLoading,
        readonly,
        onChangeFirsttName,
        onChangePassword,
        onChangeEmail,
        onChangeLastName,
        onChangeAvatar,
        onChangeUserRole,
    } = props;

    if (isLoading) {
        return <UserCardSkeleton className={className} />;
    }

    return (
        <>
            <VStack className={cls.UserCard} gap="16" max>
                <UserIdentityFields
                    data={data}
                    readonly={readonly}
                    onChangeFirsttName={onChangeFirsttName}
                    onChangeLastName={onChangeLastName}
                    onChangeEmail={onChangeEmail}
                />
                <UserAccessFields
                    data={data}
                    readonly={readonly}
                    onChangePassword={onChangePassword}
                    onChangeAvatar={onChangeAvatar}
                    onChangeUserRole={onChangeUserRole}
                />
            </VStack>
        </>
    );
};