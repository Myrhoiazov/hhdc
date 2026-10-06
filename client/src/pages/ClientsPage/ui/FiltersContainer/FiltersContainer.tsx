import { memo } from 'react';
import { useClientFilters } from '../../lib/hooks/useClientFilters';
import { ClientFilters } from '@/widgets/ClientFilters';
import { ClientTypeTabs } from '@/features/ClientTypeTabs';
import { VStack } from '@/shared/ui/Stack';
import s from './FiltersContainer.module.scss';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import { ClientPaymentStatusFilter } from '../../model/types/ClientPageSchema';

const paymentStatusOptions: SelectOption<ClientPaymentStatusFilter>[] = [
    { value: 'all', content: 'Все статусы оплаты' },
    { value: 'linked', content: 'Есть платёжный профиль' },
    { value: 'unlinked', content: 'Нет платёжного профиля' },
    { value: 'active_subscription', content: 'Active subscription' },
    { value: 'paid', content: 'Есть успешная оплата' },
    { value: 'payment_issue', content: 'Есть проблема оплаты' },
];

interface FiltersContainerProps {
    className?: string;
    reloadPage?: () => void;
}

export const FiltersContainer = memo((props: FiltersContainerProps) => {
    const { className, reloadPage } = props;
    const {
        onChangeSearch,
        onChangeSort,
        onChangeOrder,
        onChangeBranch,
        onChangePaymentStatus,
        search,
        sort,
        order,
        branchId,
        paymentStatus,
    } = useClientFilters();

    return (
        <VStack gap="16" align="end" max className={s.container}>
            <ClientFilters
                onChangeOrder={onChangeOrder}
                onChangeSort={onChangeSort}
                onChangeSearch={onChangeSearch}
                search={search}
                sort={sort}
                order={order}
                className={className}
                reloadPage={reloadPage}
            />
            <div className={s.secondaryFilters}>
                <ClientTypeTabs
                    className={s.branchFilters}
                    value={branchId}
                    onChangeType={onChangeBranch}
                />
                <Select<ClientPaymentStatusFilter>
                    className={s.paymentFilter}
                    label="Оплата"
                    value={paymentStatus}
                    options={paymentStatusOptions}
                    onChange={onChangePaymentStatus}
                />
            </div>
        </VStack>
    );
});
