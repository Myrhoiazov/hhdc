import { memo, useMemo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './TransactionSortSelector.module.scss';
import { SortOrder } from '@/shared/types/sort';
import { useTranslation } from 'react-i18next';
import { SelectOption } from '@/shared/ui/Select/Select';
import { HStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { ListBox } from '@/shared/ui/Popups';
import { TransactionSortField } from '@/entities/Transaction';
import { Month } from '@/entities/Month';

type Translate = (key: string) => string;

interface TransactionSortSelectorProps {
    className?: string;
    sort: TransactionSortField;
    order: SortOrder;
    month: Month;
    onChangeOrder: (newOrder: SortOrder) => void;
    onChangeSort: (newSort: TransactionSortField) => void;
    onChangeMonth: (month: Month) => void;
}

const buildOrderOptions = (t: Translate): SelectOption<SortOrder>[] => [
    {
        value: '',
        content: t('Выбрать значение'),
    },
    {
        value: 'asc',
        content: t('возрастанию'),
    },
    {
        value: 'desc',
        content: t('убыванию'),
    },
];

const buildSortFieldOptions = (t: Translate): SelectOption<TransactionSortField>[] => [
    {
        value: TransactionSortField.ID,
        content: t('По номерации'),
    },
    {
        value: TransactionSortField.DATE,
        content: t('дате создания'),
    },
    {
        value: TransactionSortField.CATEGORY,
        content: t('по категории'),
    },
];

const MONTH_OPTIONS: { value: Month; label: string }[] = [
    { value: Month.ALL, label: 'Все месяцы' },
    { value: Month.JANUARY, label: 'Январь' },
    { value: Month.FEBRUARY, label: 'Февраль' },
    { value: Month.MARCH, label: 'Март' },
    { value: Month.APRIL, label: 'Апрель' },
    { value: Month.MAY, label: 'Май' },
    { value: Month.JUNE, label: 'Июнь' },
    { value: Month.JULY, label: 'Июль' },
    { value: Month.AUGUST, label: 'Август' },
    { value: Month.SEPTEMBER, label: 'Сентябрь' },
    { value: Month.OCTOBER, label: 'Октябрь' },
    { value: Month.NOVEMBER, label: 'Ноябрь' },
    { value: Month.DECEMBER, label: 'Декабрь' },
];

const buildMonthOptions = (t: Translate): SelectOption<Month>[] =>
    MONTH_OPTIONS.map(({ value, label }) => ({ value, content: t(label) }));

export const TransactionSortSelector = memo((props: TransactionSortSelectorProps) => {
    const { className, onChangeOrder, onChangeMonth, onChangeSort, order, sort, month } = props;
    const { t } = useTranslation();

    const orderOptions = useMemo<SelectOption<SortOrder>[]>(() => buildOrderOptions(t), [t]);
    const sortFieldOptions = useMemo<SelectOption<TransactionSortField>[]>(() => buildSortFieldOptions(t), [t]);
    const sortMonthOptions = useMemo<SelectOption<Month>[]>(() => buildMonthOptions(t), [t]);

    return (
        <div className={classNames(s.TransactionSortSelector, {}, [className])}>
            <HStack gap="8" max>
                <Text text={t('Сортировать по:')} />
                <ListBox items={sortFieldOptions} value={sort} onChange={onChangeSort} />
                <ListBox items={orderOptions} value={order} onChange={onChangeOrder} />
                <ListBox items={sortMonthOptions} value={month} onChange={onChangeMonth} />
            </HStack>
        </div>
    );
});