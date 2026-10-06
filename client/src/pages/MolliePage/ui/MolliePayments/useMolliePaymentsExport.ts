import { useCallback } from 'react';
import { $apiPrivate } from '@/shared/api/api';
import { PaymentFilters, downloadBlob } from './molliePaymentTypes';

export const useMolliePaymentsExport = (filters: PaymentFilters) => useCallback(async (issueOnly: boolean) => {
    const response = await $apiPrivate.get('/mollie/payments/export.csv', {
        params: {
            issueOnly: issueOnly || undefined,
            status: issueOnly || filters.status === 'all' ? undefined : filters.status,
            method: filters.method === 'all' ? undefined : filters.method,
            _q: filters._q.trim() || undefined,
            dateFrom: filters.dateFrom || undefined,
            dateTo: filters.dateTo || undefined,
        },
        responseType: 'blob',
    });
    downloadBlob(response.data, issueOnly ? 'mollie-payment-issues.csv' : 'mollie-payments.csv');
}, [filters]);
