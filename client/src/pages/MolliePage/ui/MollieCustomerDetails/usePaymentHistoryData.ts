import { useCallback, useEffect, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';
import { MolliePayment } from '@/entities/MollieClient';

export const usePaymentHistoryData = (customerId: string) => {
    const [payments, setPayments] = useState<MolliePayment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);

    const loadPayments = useCallback(() => {
        setIsLoading(true);
        setError(false);

        $apiPrivate.get<MolliePayment[]>(`/mollie/customers/${customerId}/payments`, {
            params: { _ts: Date.now() },
            headers: { 'Cache-Control': 'no-cache' },
        })
            .then(({ data }) => setPayments(data ?? []))
            .catch(() => setError(true))
            .finally(() => setIsLoading(false));
    }, [customerId]);

    useEffect(() => {
        loadPayments();
        window.addEventListener('focus', loadPayments);
        return () => window.removeEventListener('focus', loadPayments);
    }, [loadPayments]);

    return { payments, isLoading, error };
};
