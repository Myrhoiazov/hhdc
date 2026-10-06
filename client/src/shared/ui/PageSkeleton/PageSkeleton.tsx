import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Skeleton } from '../Skeleton/Skeleton';
import { ListSkeleton } from '../ListSkeleton/ListSkeleton';
import cls from './PageSkeleton.module.scss';

interface PageSkeletonProps {
    className?: string;
}

export const PageSkeleton = memo(({ className }: PageSkeletonProps) => (
    <div className={classNames(cls.PageSkeleton, {}, [className])}>
        <Skeleton width={200} height={32} border="8px" />
        <Skeleton width="100%" height={44} border="10px" />
        <ListSkeleton rows={6} height={68} />
    </div>
));
