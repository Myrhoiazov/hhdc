import { useCallback } from 'react';
import { Dispatch, SetStateAction } from 'react';
import { PaymentFilters, defaultFilters } from './molliePaymentTypes';

export const useMolliePaymentsPagination = (
    filters: PaymentFilters,
    setFilters: Dispatch<SetStateAction<PaymentFilters>>,
    page: number,
    totalPages: number,
    loadPayments: (filters: PaymentFilters, page: number) => Promise<void>,
) => {
    const onApplyFilters = useCallback(() => loadPayments(filters, 1), [filters, loadPayments]);
    const onResetFilters = useCallback(() => {
        setFilters(defaultFilters);
        loadPayments(defaultFilters, 1);
    }, [setFilters, loadPayments]);
    const onPreviousPage = useCallback(
        () => loadPayments(filters, Math.max(page - 1, 1)),
        [filters, loadPayments, page],
    );
    const onNextPage = useCallback(
        () => loadPayments(filters, Math.min(page + 1, totalPages)),
        [filters, loadPayments, page, totalPages],
    );

    return {
        onApplyFilters, onResetFilters, onPreviousPage, onNextPage,
    };
};
