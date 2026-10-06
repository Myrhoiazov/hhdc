import { useCallback, useEffect, useMemo, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';
import {
    IncidentFilters, MollieIncident, MollieIncidentsResponse, defaultFilters,
} from './mollieIncidentTypes';
import { buildIncidentSummaryCards } from './incidentSummaryCards';
import { useIncidentsPagination } from './useIncidentsPagination';

const PAGE_SIZE = 25;

export const useIncidentsList = () => {
    const [filters, setFilters] = useState<IncidentFilters>(defaultFilters);
    const [incidents, setIncidents] = useState<MollieIncident[]>([]);
    const [totals, setTotals] = useState<MollieIncidentsResponse['totals']>({
        total: 0, payments: 0, subscriptions: 0, customers: 0,
    });
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);

    const loadIncidents = useCallback(async (nextFilters = filters, nextPage = page) => {
        setIsLoading(true);
        setError(false);
        try {
            const { data } = await $apiPrivate.get<MollieIncidentsResponse>('/mollie/incidents', {
                params: {
                    _page: nextPage,
                    _limit: PAGE_SIZE,
                    _q: nextFilters._q.trim() || undefined,
                    type: nextFilters.type === 'all' ? undefined : nextFilters.type,
                },
            });
            setIncidents(data.items);
            setTotals(data.totals);
            setTotal(data.total);
            setPage(data.page);
            setTotalPages(data.totalPages);
        } catch {
            setError(true);
        } finally {
            setIsLoading(false);
        }
    }, [filters, page]);

    useEffect(() => { loadIncidents(defaultFilters, 1); }, []);

    const {
        onApplyFilters, onResetFilters, onPreviousPage, onNextPage,
    } = useIncidentsPagination(filters, setFilters, page, totalPages, loadIncidents);

    const summaryCards = useMemo(() => buildIncidentSummaryCards(totals), [totals]);

    return {
        filters, setFilters, incidents, summaryCards, total, page, totalPages, isLoading, error,
        loadIncidents, onApplyFilters, onResetFilters, onPreviousPage, onNextPage,
    };
};
