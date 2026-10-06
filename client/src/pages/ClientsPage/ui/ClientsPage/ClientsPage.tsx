import { classNames } from '@/shared/lib/classNames/classNames';
import { memo, useMemo } from 'react';
import cls from './ClientsPage.module.scss';
import { Client, ClientList, ClientViewSelector } from '@/entities/Client';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { clientsPageReducer } from '../../model/slices/clientsPageSlice';
import { FiltersContainer } from '../FiltersContainer/FiltersContainer';
import { EditClientDropdown } from '@/features/editClientDropdown';
import { Text } from '@/shared/ui/Text/Text';
import { HStack } from '@/shared/ui/Stack';
import { Page } from '@/widgets/Page/Page';
import { useTranslation } from 'react-i18next';
import { useClientsPage } from './useClientsPage';

interface ClientsPageProps {
    className?: string;
}

const reducers: ReducersList = {
    clientsPage: clientsPageReducer,
};

const useClientStats = (clients: Client[]) =>
    useMemo(() => {
        const linked = clients.filter((client) => Boolean(client.mollieLinks?.length)).length;
        const branches = new Set(clients.map((client) => client.branch?.name).filter(Boolean));
        return {
            total: clients.length,
            linked,
            unlinked: clients.length - linked,
            branches: branches.size,
        };
    }, [clients]);

const ClientsStatsGrid = ({ clients }: { clients: Client[] }) => {
    const { t } = useTranslation();
    const stats = useClientStats(clients);

    return (
        <div className={cls.statsGrid}>
            <div className={cls.statCard}><span>{t('Всего учеников')}</span><strong>{stats.total}</strong></div>
            <div className={cls.statCard}><span>{t('С оплатой')}</span><strong>{stats.linked}</strong></div>
            <div className={cls.statCard}><span>{t('Без оплаты')}</span><strong>{stats.unlinked}</strong></div>
            <div className={cls.statCard}><span>{t('Филиалов')}</span><strong>{stats.branches}</strong></div>
        </div>
    );
};

const ClientsPage = (props: ClientsPageProps) => {
    const { className } = props;
    const { t } = useTranslation();
    const { clients, isLoading, view, onChangeView, onLoadNextPart, fetchAllClients } = useClientsPage();

    return (
        <DynamicModuleLoader reducers={reducers} removeAfterUnmount={false}>
            <Page
                onScrollEnd={onLoadNextPart}
                className={classNames(cls.ClientsPage, {}, [className])}
            >
                <HStack gap="16" align="center">
                    <Text title={t('ClientsList')} size="l" bold />
                    <ClientViewSelector view={view} onViewClick={onChangeView} />
                </HStack>
                <ClientsStatsGrid clients={clients} />
                <FiltersContainer reloadPage={fetchAllClients} />
                <ClientList
                    view={view}
                    isLoading={isLoading}
                    clients={clients}
                    renderAction={(client: Client) => (
                        <EditClientDropdown
                            clientId={client.id ?? ''}
                            mollieCustomerId={client.mollieLinks?.[0]?.customerId}
                            reloadPage={fetchAllClients}
                        />
                    )}
                />
            </Page>
        </DynamicModuleLoader>
    );
};

export default memo(ClientsPage);
