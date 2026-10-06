import { memo, ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './UserListItem.module.scss';
import { HStack } from '@/shared/ui/Stack';
import { Card } from '@/shared/ui/Card/Card';
import { IProfile } from '@/entities/Profile';
import { RoleKey } from '@/entities/Role';
import { RoleLabels } from '@/entities/Role/model/types/role';

interface UserListItemProps {
    className?: string;
    user: IProfile;
    renderAction?: (user: IProfile) => ReactNode;
}

const UserListItem = (props: UserListItemProps) => {
    const { className, user, renderAction } = props;

    const roleLabel = RoleLabels[user.role as RoleKey];

    return (
        <Card
            padding="16"
            fullWidth
            shadow="shadowLight"
            className={classNames(s.UserListItem, {}, [className])}
        >
            <HStack max justify="between">
                <HStack gap="48">
                    <p>
                        {user.firstName} {user.lastName}
                    </p>
                    <p>{user.email}</p>
                    <p>{roleLabel}</p>
                    <span className={classNames(s.status, { [s.disabled]: user.isEnabled === false })}>
                        {user.isEnabled === false ? 'Вход заблокирован' : 'Вход разрешён'}
                    </span>
                </HStack>
                {renderAction?.(user)}
            </HStack>
        </Card>
    );
};

export default memo(UserListItem);
