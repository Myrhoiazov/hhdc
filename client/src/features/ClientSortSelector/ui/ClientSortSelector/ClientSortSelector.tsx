import { memo, useMemo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import { ClientSortField } from '@/entities/Client';
import s from './ClientSortSelector.module.scss';
import { SortOrder } from '@/shared/types/sort';
import { useTranslation } from 'react-i18next';
import { SelectOption } from '@/shared/ui/Select/Select';
import { HStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { ListBox } from '@/shared/ui/Popups';

interface ClientSortSelectorProps {
    className?: string;
    sort: ClientSortField;
    order: SortOrder;
    onChangeOrder: (newOrder: SortOrder) => void;
    onChangeSort: (newSort: ClientSortField) => void;
}

export const ClientSortSelector = memo((props: ClientSortSelectorProps) => {
    const { className, onChangeOrder, onChangeSort, order, sort } = props;
    const { t } = useTranslation();

    const orderOptions = useMemo<SelectOption<SortOrder>[]>(
        () => [
            {
                value: 'asc',
                content: t('возрастанию'),
            },
            {
                value: 'desc',
                content: t('убыванию'),
            },
        ],
        [t]
    );

    const sortFieldOptions = useMemo<SelectOption<ClientSortField>[]>(
        () => [
            {
                value: ClientSortField.CREATED,
                content: t('дате создания'),
            },
            {
                value: ClientSortField.TITLE,
                content: t('по имени'),
            },
        ],
        [t]
    );

    return (
        <div className={classNames(s.ClientSortSelector, {}, [className])}>
            {' '}
            <HStack gap="8">
                <Text text={t('Сортировать по:')} />
                <ListBox items={sortFieldOptions} value={sort} onChange={onChangeSort} />
                <ListBox items={orderOptions} value={order} onChange={onChangeOrder} />
            </HStack>
        </div>
    );
});
