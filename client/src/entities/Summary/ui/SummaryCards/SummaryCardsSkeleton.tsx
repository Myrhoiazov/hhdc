import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Summary.module.scss';
import { memo } from 'react';
import { HStack } from '@/shared/ui/Stack';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';

export const SummaryCardsSkeleton = memo(({ className }: { className?: string }) => (
    <div className={classNames(cls.Summary, {}, [className])}>
        <HStack className={cls.cards} justify="between" align="center" gap="16" max>
            <Skeleton width="100%" height={120} border="12px" />
            <Skeleton width="100%" height={120} border="12px" />
            <Skeleton width="100%" height={120} border="12px" />
        </HStack>
    </div>
));