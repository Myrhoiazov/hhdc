import { memo, ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './UsersList.module.scss';
import { VStack } from '@/shared/ui/Stack';
import { IProfile } from '@/entities/Profile';
import UserListItem from '../UserListItem/UserListItem';
import { StateView } from '@/shared/ui/StateView';
import { ListSkeleton } from '@/shared/ui/ListSkeleton';

interface UsersListProps {
    className?: string;
    users: IProfile[];
    isLoading?: boolean;
    renderAction?: (client: IProfile) => ReactNode;
}

export const UsersList = memo((props: UsersListProps) => {
    const { className, isLoading, users, renderAction } = props;

    if (!isLoading && !users.length) {
        return (
            <StateView
                className={classNames(s.ArticleList, {}, [className])}
                title="Пользователи не найдены"
                text="Попробуйте изменить фильтры или добавьте нового пользователя."
            />
        );
    }

    const renderUser = (user: IProfile) => (
        <UserListItem className={s.card} user={user} key={user.id} renderAction={renderAction} />
    );

    return (
        <div className={classNames(s.UsersList, {}, [className])}>
            <VStack gap="16" max>
                {users.length > 0 ? users.map(renderUser) : null}
                {isLoading && <ListSkeleton rows={users.length ? 1 : 4} height={60} />}
            </VStack>
        </div>
    );
});
