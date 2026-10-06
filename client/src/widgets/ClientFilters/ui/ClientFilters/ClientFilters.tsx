import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './ClientFilters.module.scss';
import { HStack } from '@/shared/ui/Stack';
import { Input } from '@/shared/ui/Input/Input';
import { Icon } from '@/shared/ui/Icon/Icon';
import SearchIcon from '@/shared/assets/icons/search.svg';
import { ClientSortSelector } from '@/features/ClientSortSelector';
import { ClientSortField } from '@/entities/Client';
import { SortOrder } from '@/shared/types/sort';
import { Button } from '@/shared/ui/Button';
import { ClientFormModal } from '@/features/addClientForm';
import AddClientIcon from '@/shared/assets/icons/add_user_icon.svg';
import { useModalState } from '@/shared/lib/hooks/useModalState/useModalState';

interface ClientFiltersProps {
    className?: string;
    search: string;
    sort: ClientSortField;
    order: SortOrder;
    reloadPage?: () => void;
    onChangeSearch: (value: string) => void;
    onChangeOrder: (newOrder: SortOrder) => void;
    onChangeSort: (newSort: ClientSortField) => void;
}

export const ClientFilters = memo((props: ClientFiltersProps) => {
    const {
        className,
        onChangeSearch,
        search,
        onChangeSort,
        sort,
        onChangeOrder,
        order,
        reloadPage,
    } = props;
    const { isOpen: isAddClientModal, open: onShowModal, close: onCloseModal } = useModalState();
    const { t } = useTranslation();

    return (
        <div className={classNames(s.ClientFilters, {}, [className])}>
            <HStack gap="32" justify="end" align="center" max className={s.filtersRow}>
                <Input
                    onChange={onChangeSearch}
                    value={search}
                    size="s"
                    placeholder={t('Поиск')}
                    addonLeft={<Icon Svg={SearchIcon} />}
                />
                <ClientSortSelector
                    order={order}
                    sort={sort}
                    onChangeOrder={onChangeOrder}
                    onChangeSort={onChangeSort}
                />

                <Button onClick={onShowModal} className={s.btn}>
                    {t('Добавить клиента')}
                    <Icon Svg={AddClientIcon} width={24} color="fill" />
                </Button>
            </HStack>
            <ClientFormModal
                isOpen={isAddClientModal}
                onClose={onCloseModal}
                reloadPage={reloadPage}
            />
        </div>
    );
});
