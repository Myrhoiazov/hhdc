import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { useInitialEffect } from '@/shared/lib/hooks/useInitialEffect/useInitialEffect';
import { $apiPrivate } from '@/shared/api/api';
import { fetchMollieClientsList } from '../../model/services/fetchMollieClientsList/fetchMollieClientsList';
import {
    getMollieClients,
} from '../../model/slices/mollieClientsDetailsPageSlice';
import {
    getMollieClientsPageError,
    getMollieClientsPageIsLoading,
    getMollieClientsPageLimit,
    getMollieClientsPagePage,
    getMollieClientsPageTotal,
    getMollieClientsPageTotalPages,
} from '../../model/selectors/mollieClientsPageSelectors';
import {
    useMollieCustomersFilters,
    defaultFilters,
    type MollieCustomersFiltersState,
} from './useMollieCustomersFilters';

const PAGE_SIZE = 15;

export const useMollieCustomers = () => {
    const dispatch = useAppDispatch();
    const mollieClients = useSelector(getMollieClients.selectAll);
    const isLoading = useSelector(getMollieClientsPageIsLoading);
    const error = useSelector(getMollieClientsPageError);
    const page = useSelector(getMollieClientsPagePage);
    const limit = useSelector(getMollieClientsPageLimit);
    const total = useSelector(getMollieClientsPageTotal);
    const totalPages = useSelector(getMollieClientsPageTotalPages);
    const filtersHook = useMollieCustomersFilters();
    const { filters, resetFilters } = filtersHook;
    const firstItemNumber = total ? (page - 1) * limit + 1 : 0;
    const lastItemNumber = Math.min(page * limit, total);

    const fetchAllClients = useCallback((nextFilters: MollieCustomersFiltersState = filters, nextPage = page) => {
        dispatch(fetchMollieClientsList({ replace: true, page: nextPage, limit: PAGE_SIZE, ...nextFilters }));
    }, [dispatch, filters, page]);

    useInitialEffect(() => {
        dispatch(fetchMollieClientsList({ replace: true, page: 1, limit: PAGE_SIZE, ...defaultFilters }));
    });

    const onApplyFilters = useCallback(() => fetchAllClients(filters, 1), [fetchAllClients, filters]);
    const onResetFilters = useCallback(() => { resetFilters(); fetchAllClients(defaultFilters, 1); }, [fetchAllClients, resetFilters]);
    const onPreviousPage = useCallback(() => fetchAllClients(filters, Math.max(page - 1, 1)), [fetchAllClients, filters, page]);
    const onNextPage = useCallback(() => fetchAllClients(filters, Math.min(page + 1, totalPages)), [fetchAllClients, filters, page, totalPages]);

    const onExportActiveSubscriptions = useCallback(async () => {
        const response = await $apiPrivate.get('/mollie/customers/active-subscriptions/export.csv', {
            params: { _q: filters._q.trim() || undefined }, responseType: 'blob',
        });
        const url = URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'active-subscriptions.csv';
        link.click();
        URL.revokeObjectURL(url);
    }, [filters._q]);

    return { mollieClients, isLoading, error, page, total, totalPages, firstItemNumber, lastItemNumber, filtersHook, fetchAllClients, onApplyFilters, onResetFilters, onPreviousPage, onNextPage, onExportActiveSubscriptions };
};
