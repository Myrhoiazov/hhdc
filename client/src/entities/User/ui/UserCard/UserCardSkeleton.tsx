import { classNames } from '@/shared/lib/classNames/classNames';
import { VStack } from '@/shared/ui/Stack';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import cls from './UserCard.module.scss';

export const UserCardSkeleton = ({ className }: { className?: string }) => (
    <div className={classNames(cls.ProfileCard, { [cls.loading]: true }, [className])}>
        <VStack gap="16" max>
            <Skeleton width="100%" height={72} border="14px" />
            <Skeleton width="100%" height={72} border="14px" />
            <Skeleton width="100%" height={72} border="14px" />
            <Skeleton width="100%" height={72} border="14px" />
            <Skeleton width="100%" height={72} border="14px" />
        </VStack>
    </div>
);