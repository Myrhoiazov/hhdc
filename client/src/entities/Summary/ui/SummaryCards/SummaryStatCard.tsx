import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Summary.module.scss';
import { memo } from 'react';
import { HStack } from '@/shared/ui/Stack';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';

interface SummaryStatCardProps {
    title: string;
    value: string;
    cardClassName?: string;
}

export const SummaryStatCard = memo(({ title, value, cardClassName }: SummaryStatCardProps) => (
    <Card className={classNames(cls.card, {}, [cardClassName])} padding="16">
        <HStack justify="between" gap="16">
            <Text className={cls.title} title={title} />
            <Text className={cls.title} title={value} />
        </HStack>
    </Card>
));