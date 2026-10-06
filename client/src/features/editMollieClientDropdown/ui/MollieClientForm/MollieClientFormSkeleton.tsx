import { VStack } from '@/shared/ui/Stack';
import { Skeleton } from '@/shared/ui/Skeleton';
import cls from './MollieClientForm.module.scss';

export const MollieClientFormSkeleton = () => (
    <VStack gap="24" align="center" className={cls.header}>
        <Skeleton width={260} height={24} border="6px" />
        {Array.from({ length: 8 }, (_, index) => <Skeleton key={index} width="100%" height={72} border="14px" />)}
        <Skeleton width="100%" height={44} border="32px" />
    </VStack>
);
