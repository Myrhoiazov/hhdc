import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import cls from './ListSkeleton.module.scss';

interface ListSkeletonProps {
    className?: string;
    rows?: number;
    height?: string | number;
    border?: string;
}

export const ListSkeleton = memo((props: ListSkeletonProps) => {
    const {
        className,
        rows = 4,
        height = 68,
        border = '14px',
    } = props;

    return (
        <div className={classNames(cls.ListSkeleton, {}, [className])}>
            {Array.from({ length: rows }, (_, index) => (
                <Skeleton key={index} width="100%" height={height} border={border} />
            ))}
        </div>
    );
});
