import { useCallback, useEffect, useMemo, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';
import {
    PaymentFilters, MolliePayment, MolliePaymentsResponse, defaultFilters, issueStatuses, buildPaymentParams,
} from './molliePaymentTypes';
import { useMolliePaymentsPagination } from './useMolliePaymentsPagination';

export const useMolliePaymentsList = () => {
    const [filters, setFilters] = useState<PaymentFilters>(defaultFilters);
    const [payments, setPayments] = useState<MolliePayment[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);

    const loadPayments = useCallback(async (nextFilters = filters, nextPage = page) => {
        setIsLoading(true);
        setError(false);
        try {
            const { data } = await $apiPrivate.get<MolliePaymentsResponse>('/mollie/payments', {
                params: buildPaymentParams(nextFilters, nextPage),
            });
            setPayments(data.items);
            setTotal(data.total);
            setPage(data.page);
            setTotalPages(data.totalPages);
        } catch {
            setError(true);
        } finally {
            setIsLoading(false);
        }
    }, [filters, page]);

    useEffect(() => { loadPayments(defaultFilters, 1); }, []);

    const {
        onApplyFilters, onResetFilters, onPreviousPage, onNextPage,
    } = useMolliePaymentsPagination(filters, setFilters, page, totalPages, loadPayments);

    const problemCount = useMemo(
        () => payments.filter((payment) => issueStatuses.includes(payment.status)).length,
        [payments],
    );

    return {
        filters, setFilters, payments, total, page, totalPages, isLoading, error, problemCount,
        loadPayments, onApplyFilters, onResetFilters, onPreviousPage, onNextPage,
    };
};
