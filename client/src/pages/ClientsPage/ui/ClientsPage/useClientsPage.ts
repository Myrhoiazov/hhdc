import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { useInitialEffect } from '@/shared/lib/hooks/useInitialEffect/useInitialEffect';
import { ClientView } from '@/entities/Client';
import { CLIENT_CREATED_EVENT } from '@/shared/const/events';
import { clientsPageActions, getClients } from '../../model/slices/clientsPageSlice';
import { getClientsPageIsLoading, getClientsPageView } from '../../model/selectors/clientsPageSelectors';
import { fetchNextClientsPage } from '../../model/services/fetchNextClientsPage/fetchNextClientsPage';
import { initClientsPage } from '../../model/services/initClientsPage/initClientsPage';
import { fetchClientsList } from '../../model/services/fetchClientsList/fetchClientsList';

export const useClientsPage = () => {
    const dispatch = useAppDispatch();
    const clients = useSelector(getClients.selectAll);
    const isLoading = useSelector(getClientsPageIsLoading);
    const view = useSelector(getClientsPageView);
    const [searchParams] = useSearchParams();

    const onChangeView = useCallback((nextView: ClientView) => {
        dispatch(clientsPageActions.setView(nextView));
    }, [dispatch]);

    const onLoadNextPart = useCallback(() => {
        dispatch(fetchNextClientsPage());
    }, [dispatch]);

    useInitialEffect(() => {
        dispatch(initClientsPage(searchParams));
    });

    const fetchAllClients = useCallback(() => {
        dispatch(fetchClientsList({ replace: true, noQuery: true }));
    }, [dispatch]);

    // A client can also be created from the global "Добавить клиента" button in Navbar,
    // which lives outside this page — it signals us via a DOM event instead of a prop.
    useEffect(() => {
        window.addEventListener(CLIENT_CREATED_EVENT, fetchAllClients);
        return () => window.removeEventListener(CLIENT_CREATED_EVENT, fetchAllClients);
    }, [fetchAllClients]);

    return { clients, isLoading, view, onChangeView, onLoadNextPart, fetchAllClients };
};
