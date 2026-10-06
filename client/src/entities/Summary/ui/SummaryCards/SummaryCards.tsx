import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Summary.module.scss';
import { memo } from 'react';
import { Summary } from '../../model/types/summary';
import { HStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { SummaryCardsSkeleton } from './SummaryCardsSkeleton';
import { SummaryStatCard } from './SummaryStatCard';

interface SummaryCardsProps {
    className?: string;
    summary?: Summary;
    isLoading?: boolean;
}

export const SummaryCards = memo((props: SummaryCardsProps) => {
    const { className, summary, isLoading } = props;
    const formatMoney = (value?: number) => new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR',
    }).format(value ?? 0);

    if (isLoading) {
        return <SummaryCardsSkeleton className={className} />;
    }

    if (!summary) {
        return (
            <div className={classNames(cls.Summary, {}, [])}>
                <Text size="l" title="Клиенты не найдены" className={cls.title} />
            </div>
        );
    }

    return (
        <div className={classNames(cls.Summary, {}, [className])}>
            <HStack className={cls.cards} justify="between" align="center" gap="16">
                <SummaryStatCard title="Приход" value={formatMoney(summary.income)} cardClassName={cls.incomeCard} />
                <SummaryStatCard title="Расход" value={formatMoney(summary.expense)} cardClassName={cls.expenseCard} />
                <SummaryStatCard title="Баланс" value={formatMoney(summary.balance)} cardClassName={cls.balanceCard} />
            </HStack>
        </div>
    );
});