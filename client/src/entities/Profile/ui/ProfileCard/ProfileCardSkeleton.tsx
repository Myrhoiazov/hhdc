import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import cls from './ProfileCard.module.scss';

export const ProfileCardSkeleton = memo(({ className }: { className?: string }) => (
    <div className={classNames(cls.ProfileCard, {}, [className, cls.loading])}>
        <div className={cls.inner}>
            <Skeleton width={160} height={20} border="8px" />
            <div className={cls.fieldsGrid}>
                <Skeleton width="100%" height={72} border="14px" />
                <Skeleton width="100%" height={72} border="14px" />
                <Skeleton className={cls.fieldFull} width="100%" height={72} border="14px" />
                <Skeleton className={cls.fieldFull} width="100%" height={72} border="14px" />
                <Skeleton className={cls.fieldFull} width="100%" height={72} border="14px" />
            </div>
        </div>
    </div>
));