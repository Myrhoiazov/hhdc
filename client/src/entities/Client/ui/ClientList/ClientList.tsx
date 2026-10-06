import { memo, ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './ClientList.module.scss';
import { Client, ClientView } from '../../model/types/client';
import { VStack } from '@/shared/ui/Stack';
import ClientListItem from '../ClientListItem/ClientListItem';
import ClientListHeader from '../ClientListHeader/ClientListHeader';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { StateView } from '@/shared/ui/StateView';
import { ListSkeleton } from '@/shared/ui/ListSkeleton';

interface ClientListProps {
    className?: string;
    clients: Client[];
    isLoading?: boolean;
    renderAction?: (client: Client) => ReactNode;
    view: ClientView;
}

export const ClientList = memo((props: ClientListProps) => {
    const { className, view, isLoading, clients, renderAction } = props;

    if (!isLoading && !clients.length) {
        return (
            <StateView
                className={classNames(s.ArticleList, {}, [className])}
                title="Клиенты не найдены"
                text="Добавьте ученика или измените фильтры поиска."
            />
        );
    }

    const renderClient = (client: Client) => (
        <ClientListItem
            className={s.card}
            client={client}
            key={client.id}
            view={view}
            renderAction={renderAction}
        />
    );

    if (view === ClientView.SMALL) {
        return (
            <div className={classNames(s.ClientList, {}, [className, s.tiles])}>
                {clients.length > 0 ? clients.map(renderClient) : null}
                {isLoading && (
                    <>
                        <Skeleton width="100%" height={220} border="16px" />
                        <Skeleton width="100%" height={220} border="16px" />
                        <Skeleton width="100%" height={220} border="16px" />
                    </>
                )}
            </div>
        );
    }

    return (
        <div className={classNames(s.ClientList, {}, [className])}>
            <div className={s.tableWrapper}>
                <ClientListHeader />
                <VStack gap="16">
                    {clients.length > 0 ? clients.map(renderClient) : null}
                    {isLoading && <ListSkeleton rows={clients.length ? 1 : 4} height={60} />}
                </VStack>
            </div>
        </div>
    );
});
