import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './TransactionFilters.module.scss';
import { Button } from '@/shared/ui/Button';
import { AddTransactionFormModal } from '@/features/addTransactionForm';
import Plus from '@/shared/assets/icons/plus.svg';
import { Icon } from '@/shared/ui/Icon/Icon';
import { TransactionSortSelector } from '@/features/TransactionSortSelector';
import { TransactionSortField } from '@/entities/Transaction';
import { SortOrder } from '@/shared/types/sort';
import { Input } from '@/shared/ui/Input/Input';
import SearchIcon from '@/shared/assets/icons/search.svg';
import { HStack } from '@/shared/ui/Stack';
import { useTranslation } from 'react-i18next';
import { Month } from '@/entities/Month';
import { useModalState } from '@/shared/lib/hooks/useModalState/useModalState';

interface TransactionFiltersProps {
    className?: string;
    search: string;
    month: Month;
    sort: TransactionSortField;
    order: SortOrder;
    reloadPage?: () => void;
    onChangeSearch: (value: string) => void;
    onChangeOrder: (newOrder: SortOrder) => void;
    onChangeSort: (newSort: TransactionSortField) => void;
    onChangeMonth: (month: Month) => void;
}

export const TransactionFilters = memo((props: TransactionFiltersProps) => {
    const {
        className,
        onChangeSearch,
        search,
        onChangeSort,
        sort,
        onChangeOrder,
        order,
        reloadPage,
        onChangeMonth,
        month,
    } = props;
    const { isOpen: isModalOpen, open: onShowModal, close: onCloseModal } = useModalState();
    const { t } = useTranslation();

    return (
        <div className={classNames(s.TransactionFilters, {}, [className])}>
            <HStack gap="16" justify="end" align="center" max className={s.controls}>
                <Input
                    className={s.search}
                    onChange={onChangeSearch}
                    value={search}
                    size="s"
                    placeholder="Поиск"
                    addonLeft={<Icon Svg={SearchIcon} />}
                />
                <TransactionSortSelector
                    sort={sort}
                    order={order}
                    month={month}
                    onChangeMonth={onChangeMonth}
                    onChangeOrder={onChangeOrder}
                    onChangeSort={onChangeSort}
                />
                <Button onClick={onShowModal} className={s.btn}>
                    {t('Создать ')} <Icon Svg={Plus} width={24} color="stroke" />
                </Button>
            </HStack>

            <AddTransactionFormModal
                isOpen={isModalOpen}
                onClose={onCloseModal}
                reloadPage={reloadPage}
            />
        </div>
    );
});
