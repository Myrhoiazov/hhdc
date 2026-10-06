import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useTranslation } from 'react-i18next';
import { DynamicModuleLoader, ReducersList } from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { mollieClientsPageSliceReducer } from '../../model/slices/mollieClientsDetailsPageSlice';
import { MollieClient, MollieClientList } from '@/entities/MollieClient';
import { EditMollieClientDropdown } from '@/features/editMollieClientDropdown';
import { HStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { MollieClientAction } from '@/widgets/MollieClientAction';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import s from './MollieCustomers.module.scss';
import { MollieCustomersFiltersBar } from './MollieCustomersFiltersBar';
import { MollieCustomersPagination } from './MollieCustomersPagination';
import { useMollieCustomers } from './useMollieCustomers';

interface MollieCustomersProps {
    className?: string;
}

const reducers: ReducersList = {
    mollieClientsPage: mollieClientsPageSliceReducer,
};

const MollieCustomersHeader = ({ onExportActiveSubscriptions, fetchAllClients }: {
    onExportActiveSubscriptions: () => void;
    fetchAllClients: () => void;
}) => {
    const { t } = useTranslation();
    return (
        <HStack justify="between" align="center" max>
            <Text title={t('Mollie Customers')} bold />
            <HStack gap="8" wrap="wrap">
                <Button theme={ButtonTheme.OUTLINE} onClick={onExportActiveSubscriptions}>
                    {t('CSV активные подписки')}
                </Button>
                <MollieClientAction reloadPage={fetchAllClients} />
            </HStack>
        </HStack>
    );
};

export const MollieCustomers = memo(({ className }: MollieCustomersProps) => {
    const {
        mollieClients, isLoading, error, page, total, totalPages,
        firstItemNumber, lastItemNumber, filtersHook, fetchAllClients,
        onApplyFilters, onResetFilters, onPreviousPage, onNextPage, onExportActiveSubscriptions,
    } = useMollieCustomers();

    const pagination = (
        <MollieCustomersPagination
            isLoading={isLoading} error={error} total={total} page={page} totalPages={totalPages}
            firstItemNumber={firstItemNumber} lastItemNumber={lastItemNumber}
            onPrevious={onPreviousPage} onNext={onNextPage}
        />
    );

    return (
        <DynamicModuleLoader reducers={reducers}>
            <div className={classNames(s.MollieCustomers, {}, [className])}>
                <MollieCustomersHeader onExportActiveSubscriptions={onExportActiveSubscriptions} fetchAllClients={fetchAllClients} />
                <MollieCustomersFiltersBar
                    filters={filtersHook.filters} isLoading={isLoading}
                    onSearch={filtersHook.onChangeSearch} onSubscriptionStatus={filtersHook.onChangeSubscriptionStatus}
                    onHasSubscriptions={filtersHook.onChangeHasSubscriptions} onHasMandates={filtersHook.onChangeHasMandates}
                    onApply={onApplyFilters} onReset={onResetFilters}
                />
                {pagination}
                <MollieClientList
                    isLoading={isLoading} error={error} clients={mollieClients}
                    renderAction={(client: MollieClient) => (
                        <EditMollieClientDropdown clientId={client.id ?? ''} reloadPage={fetchAllClients} />
                    )}
                />
                {pagination}
            </div>
        </DynamicModuleLoader>
    );
});
