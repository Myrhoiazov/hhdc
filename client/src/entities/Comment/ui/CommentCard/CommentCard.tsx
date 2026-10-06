import { classNames } from '@/shared/lib/classNames/classNames';
import { memo } from 'react';
import { Avatar } from '@/shared/ui/Avatar/Avatar';
import { Text } from '@/shared/ui/Text/Text';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import cls from './CommentCard.module.scss';
import { Comment } from '../../model/types/comment';
import { AppLink } from '@/shared/ui/AppLink/AppLink';
import { RoutePath } from '@/shared/config/routeConfig/routeConfig';
import UserIcon from '@/shared/assets/icons/user-32-32.png';
import { HStack } from '@/shared/ui/Stack';

interface CommentCardProps {
    className?: string;
    comment: Comment;
    isLoading?: boolean;
}

export const CommentCard = memo((props: CommentCardProps) => {
    const { className, comment, isLoading } = props;

    const date = new Date(comment?.createdAt || '');
    const readable = date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    if (isLoading) {
        return (
            <div className={classNames(cls.CommentCard, {}, [className])}>
                <div className={cls.header}>
                    <Skeleton width={30} height={30} border="50%" />
                    <Skeleton height={16} width={100} className={cls.username} />
                </div>
                <Skeleton className={cls.text} width="100%" height={50} />
            </div>
        );
    }

    return (
        <div className={classNames(cls.CommentCard, {}, [className])}>
            <HStack justify="end">
                <Text text={readable} size="s" />
            </HStack>
            <AppLink to={`${RoutePath.profile}${comment.author.id}`} className={cls.header}>
                {comment.author.avatar ? (
                    <Avatar size={30} src={comment.author.avatar} />
                ) : (
                    <Avatar src={UserIcon} size={30} />
                )}
                <Text className={cls.username} title={comment.author.firstName} />
            </AppLink>
            <Text className={cls.text} text={comment.text} />
        </div>
    );
});
