import { memo } from 'react';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import cls from './ArticleDetails.module.scss';

export const ArticleDetailsSkeleton = memo(() => (
    <>
        <Skeleton className={cls.avatar} width={200} height={200} border="50%" />
        <Skeleton className={cls.title} width={300} height={32} />
        <Skeleton className={cls.skeleton} width={600} height={24} />
        <Skeleton className={cls.skeleton} width="100%" height={200} />
        <Skeleton className={cls.skeleton} width="100%" height={200} />
    </>
));