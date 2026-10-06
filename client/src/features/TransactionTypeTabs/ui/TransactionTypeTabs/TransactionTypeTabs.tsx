import { useTranslation } from 'react-i18next';
import { memo, useCallback, useMemo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Tabs, TabItem } from '@/shared/ui/Tabs';
import { TransactionType } from '@/entities/TransactionType';

interface TransactionTypeTabsProps {
    className?: string;
    value: TransactionType;
    onChangeType: (type: TransactionType) => void;
}

export const TransactionTypeTabs = memo((props: TransactionTypeTabsProps) => {
    const { className, value, onChangeType } = props;
    const { t } = useTranslation();

    const typeTabs = useMemo<TabItem[]>(
        () => [
            {
                value: TransactionType.ALL,
                content: t('Все транзакции'),
            },
            {
                value: TransactionType.INCOME,
                content: t('Приход'),
            },
            {
                value: TransactionType.EXPENSE,
                content: t('Расход'),
            },
        ],
        [t]
    );

    const onTabClick = useCallback(
        (tab: TabItem) => {
            onChangeType(tab.value as TransactionType);
        },
        [onChangeType]
    );

    return (
        <Tabs
            direction="row"
            tabs={typeTabs}
            value={value}
            onTabClick={onTabClick}
            className={classNames('', {}, [className])}
        />
    );
});
