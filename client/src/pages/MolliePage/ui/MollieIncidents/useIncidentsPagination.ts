import { useCallback } from 'react';
import { Dispatch, SetStateAction } from 'react';
import { IncidentFilters, defaultFilters } from './mollieIncidentTypes';

export const useIncidentsPagination = (
    filters: IncidentFilters,
    setFilters: Dispatch<SetStateAction<IncidentFilters>>,
    page: number,
    totalPages: number,
    loadIncidents: (filters: IncidentFilters, page: number) => Promise<void>,
) => {
    const onApplyFilters = useCallback(() => loadIncidents(filters, 1), [filters, loadIncidents]);
    const onResetFilters = useCallback(() => {
        setFilters(defaultFilters);
        loadIncidents(defaultFilters, 1);
    }, [setFilters, loadIncidents]);
    const onPreviousPage = useCallback(
        () => loadIncidents(filters, Math.max(page - 1, 1)),
        [filters, loadIncidents, page],
    );
    const onNextPage = useCallback(
        () => loadIncidents(filters, Math.min(page + 1, totalPages)),
        [filters, loadIncidents, page, totalPages],
    );

    return {
        onApplyFilters, onResetFilters, onPreviousPage, onNextPage,
    };
};
